import { NextResponse } from 'next/server';
import cron from 'node-cron';
import cronParser from 'cron-parser';

// Prevent tree-shaking for scheduler deps in standalone
const _dummy = [cron, cronParser];

export const dynamic = 'force-dynamic';
import prisma from '@/lib/db';
import { getMergedConfigs } from '@/lib/db/config-helper';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const rawAccountId = searchParams.get('accountId') || 'global';
        const accountId = rawAccountId.toLowerCase();
        const keysParam = searchParams.get('keys');

        if (keysParam) {
            const keysArr = keysParam.split(',');
            // Se for INSTAGRAM_ACCOUNTS, retorna do ENV (mantendo retrocompatibilidade se necessário)
            if (keysArr.includes('INSTAGRAM_ACCOUNTS')) {
                return NextResponse.json({
                    INSTAGRAM_ACCOUNTS: process.env.INSTAGRAM_ACCOUNTS || '[]'
                });
            }

            const merged = await getMergedConfigs(accountId, keysArr);
            console.log(`[API|Settings] GET keys: ${keysParam}, accountId: ${accountId}, result:`, JSON.stringify(merged));
            return NextResponse.json(merged);
        }

        // Caso default: retorna todas as chaves relevantes para a UI
        const relevantKeys = [
            'isActive',
            'PUBLISH_NEWS_ENABLED',
            'PUBLISH_ORIGINALS_ENABLED',
            'SCRAPER_LIMIT_PER_SOURCE',
            'DATA_SOURCES',
            'THEMES',
            'IG_MONITOR_TARGETS',
            'CHANNEL_INSTAGRAM_FEED',
            'CHANNEL_INSTAGRAM_STORY',
            'CHANNEL_INSTAGRAM_REELS',
            'CHANNEL_WHATSAPP',
            'CHANNEL_YOUTUBE_SHORTS',
            'postingTimes',
            'POSTING_TIMES',
            'imageStyle',
            'primaryColor',
            'feed_layout',
            'FEED_LAYOUT',
            'story_layout',
            'STORY_LAYOUT',
            'reels_layout',
            'REELS_LAYOUT',
            'schedulerEnabled',
            'SCHEDULER_TRIGGERS'
        ];

        const mergedConfigs = await getMergedConfigs(accountId, relevantKeys);
        
        // Valores padrão para garantir que a UI tenha o que exibir (especialmente booleans)
        const defaults: Record<string, any> = {
            isActive: true,
            CHANNEL_INSTAGRAM_FEED: false,
            CHANNEL_INSTAGRAM_STORY: false,
            CHANNEL_INSTAGRAM_REELS: false,
            CHANNEL_WHATSAPP: false,
            CHANNEL_YOUTUBE_SHORTS: false,
            schedulerEnabled: true,
            SCRAPER_LIMIT_PER_SOURCE: 4,
            imageStyle: 'modern',
            primaryColor: '#1a1a1a'
        };

        // Normalização básica para a UI (garantir que layouts estejam disponíveis em minúsculas)
        const normalized = { ...defaults };
        for (const [key, value] of Object.entries(mergedConfigs)) {
            if (value !== undefined) {
                normalized[key] = value;
            }
        }
        if (mergedConfigs.STORY_LAYOUT && !mergedConfigs.story_layout) normalized.story_layout = mergedConfigs.STORY_LAYOUT;
        if (mergedConfigs.FEED_LAYOUT && !mergedConfigs.feed_layout) normalized.feed_layout = mergedConfigs.FEED_LAYOUT;
        if (mergedConfigs.REELS_LAYOUT && !mergedConfigs.reels_layout) normalized.reels_layout = mergedConfigs.REELS_LAYOUT;
        if (mergedConfigs.POSTING_TIMES && !mergedConfigs.postingTimes) normalized.postingTimes = mergedConfigs.POSTING_TIMES;

        return NextResponse.json(normalized);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        
        // Limite de 20 alterações por minuto por IP
        if (!rateLimit(ip, 20, 60000)) {
            return NextResponse.json({ 
                error: 'Muitas alterações em pouco tempo. Aguarde um momento.' 
            }, { status: 429 });
        }

        const body = await req.json();
        const { accountId: rawAccountId = 'global', ...rest } = body;
        const accountId = rawAccountId.toLowerCase();

        console.log(`[API|Settings] Salvando para [${accountId}]. Chaves:`, Object.keys(rest));
        console.log(`[API|Settings] Payload:`, JSON.stringify(rest));

        const results = [];
        const entriesToSave: [string, any][] = [];

        // Detectar formato (chave única ou objeto de chaves)
        if (rest.key !== undefined && rest.value !== undefined) {
            entriesToSave.push([rest.key, rest.value]);
        } else {
            for (const [k, v] of Object.entries(rest)) {
                if (k === 'accountId') continue;

                // Normalização de tipos para garantir que booleans em string virem booleans reais no JSON
                let normalizedValue = v;
                if (v === 'true') normalizedValue = true;
                if (v === 'false') normalizedValue = false;
                if (v === 'null') normalizedValue = null;

                entriesToSave.push([k, normalizedValue]);
            }
        }

        for (const [k, v] of entriesToSave) {
            console.log(`[API] Upserting SystemConfig: accountId=${accountId}, key=${k}, value=`, v);

            // Para SCHEDULER_TRIGGERS: limpar TODOS os registros daquela chave em TODOS os accountIds
            // antes de salvar o novo, garantindo que não haja triggers fantasma de saves anteriores.
            if (k === 'SCHEDULER_TRIGGERS') {
                console.log(`[API] SCHEDULER_TRIGGERS detectado. Limpando todos os triggers antigos para accountId=${accountId} e 'global' antes de salvar...`);
                await prisma.systemConfig.deleteMany({
                    where: {
                        key: 'SCHEDULER_TRIGGERS',
                        OR: [
                            { accountId: accountId },
                            { accountId: 'global' }
                        ]
                    }
                });
                // Agora salva o novo registro
                const config = await prisma.systemConfig.create({
                    data: {
                        key: k,
                        value: v as any,
                        accountId: 'global' // Triggers sempre salvos como global
                    }
                });
                results.push(config);
                console.log(`[API] ✅ SCHEDULER_TRIGGERS salvo limpo (triggers antigos removidos).`);
                continue;
            }

            const config = await prisma.systemConfig.upsert({
                where: {
                    key_accountId: {
                        key: k,
                        accountId: accountId
                    }
                },
                update: { value: v as any },
                create: {
                    key: k,
                    value: v as any,
                    accountId: accountId
                },
            });
            results.push(config);
        }

        // Registrar no AuditLog
        await prisma.auditLog.create({
            data: {
                action: 'SETTINGS_UPDATE',
                details: { accountId, keys: entriesToSave.map(([k]) => k) }
            }
        }).catch((e) => console.error('[API] Falha ao registrar AuditLog:', e.message));

        return NextResponse.json({ success: true, count: results.length });
    } catch (error: any) {
        console.error('[API] Erro crítico ao salvar configurações:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
