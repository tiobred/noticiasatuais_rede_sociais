import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getMergedConfigs } from '@/lib/db/config-helper';

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
            return NextResponse.json(merged);
        }

        // Caso default: retorna todas as chaves relevantes para a UI
        const relevantKeys = [
            'isActive',
            'SCRAPER_LIMIT_PER_SOURCE',
            'DATA_SOURCES',
            'THEMES',
            'IG_MONITOR_TARGETS',
            'CHANNEL_INSTAGRAM_FEED',
            'CHANNEL_INSTAGRAM_STORY',
            'CHANNEL_INSTAGRAM_REELS',
            'CHANNEL_WHATSAPP',
            'postingTimes',
            'imageStyle',
            'primaryColor',
            'feed_layout',
            'story_layout',
            'reels_layout',
            'schedulerEnabled'
        ];

        const mergedConfigs = await getMergedConfigs(accountId, relevantKeys);
        return NextResponse.json(mergedConfigs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { accountId: rawAccountId = 'global', ...rest } = body;
        const accountId = rawAccountId.toLowerCase();

        console.log(`[API] Requisição de salvamento recebida para [${accountId}]:`, Object.keys(rest));

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
