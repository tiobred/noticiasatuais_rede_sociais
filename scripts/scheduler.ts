import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/db';
import { runPipeline } from '../lib/agents/orchestrator';
import { getMergedConfigs } from '../lib/db/config-helper';
import { RunStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import cronParser from 'cron-parser';

let supabaseClient: any = null;

function getSupabaseClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    
    if (!url || !key) return null;
    
    if (!supabaseClient) {
        supabaseClient = createClient(url, key);
    }
    return supabaseClient;
}

const SLIDE_BUCKET = 'carousel-slides';

/**
 * Scheduler Service — gerencia o agendamento de postagens baseado no SystemConfig isolado por Conta
 */

function generateTimeSlots(start: string, end: string, interval: number): string[] {
    if (!start || !end || !interval) return [];
    const slots: string[] = [];
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let current = startH * 60 + startM;
    const limit = endH * 60 + endM;
    
    while (current <= limit) {
        const h = Math.floor(current / 60).toString().padStart(2, '0');
        const m = (current % 60).toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
        current += interval;
    }
    return slots;
}

function matchesCron(expression: string, date: Date = new Date()): boolean {
    try {
        const minuteStart = new Date(date);
        minuteStart.setSeconds(0, 0);
        const backDate = new Date(minuteStart.getTime() - 1000);
        const interval = cronParser.parseExpression(expression, { 
            tz: 'America/Sao_Paulo', 
            currentDate: backDate 
        });
        const nextDate = interval.next().toDate();
        const diffMs = Math.abs(nextDate.getTime() - minuteStart.getTime());
        return diffMs < 1000;
    } catch (e) {
        return false;
    }
}

async function startScheduler() {
    console.log('\n🕒 Iniciando serviço de agendamento (Modo Multi-Contas)...');

    // Limpeza inicial de possíveis runs travados
    await cleanupStuckRuns();

    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    let allAccounts: { id: string, name: string, userId: string, accessToken: string }[] = [];
    try {
        allAccounts = JSON.parse(allAccountsStr);
    } catch (e: any) { 
        console.error('❌ Erro ao parsear INSTAGRAM_ACCOUNTS:', e.message);
        await prisma.auditLog.create({
            data: {
                action: 'SCHEDULER_ERROR',
                details: { error: 'JSON_PARSE_ACCOUNTS', message: e.message }
            }
        }).catch(() => {});
    }

    console.log(`📌 Encontradas ${allAccounts.length} contas configuradas no .env.`);
    if (allAccounts.length === 0) {
        console.warn('⚠️ Nenhuma conta encontrada! Verifique a variável INSTAGRAM_ACCOUNTS no .env.');
    }

    // 1. Loop de monitoramento minuto a minuto em vez de node-cron (para maior robustez)
    (async () => {
        console.log('🚀 Monitoramento de gatilhos ativado (Polling 60s)');
        
        while (true) {
            const now = new Date();

            // Calcular hora/minuto BR de forma determinística (evita variação de locale do Intl.DateTimeFormat)
            const nowBrRef = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
            const brH = nowBrRef.getHours();
            const brM = nowBrRef.getMinutes();
            const brTime = `${String(brH).padStart(2, '0')}:${String(brM).padStart(2, '0')}`;
            
            console.log(`\n[${now.toLocaleTimeString()}] 🕒 Check: ${brTime} BR (${allAccounts.length} contas)`);

            // Comentado para evitar inflar o banco de dados
            /*
            await prisma.auditLog.create({
                data: {
                    action: 'SCHEDULER_CHECK',
                    details: { 
                        timeUtc: now.toISOString(), 
                        timeBr: brTime,
                        accountsProcessed: allAccounts.length
                    }
                }
            }).catch(e => console.error('Erro ao gravar AuditLog:', e));
            */

            const accountsToRun = [];

            for (const account of allAccounts) {
                try {
                    const relevantKeys = [
                        'isActive', 'schedulerEnabled', 'CHANNEL_INSTAGRAM_FEED', 
                        'CHANNEL_INSTAGRAM_STORY', 'CHANNEL_INSTAGRAM_REELS', 
                        'CHANNEL_YOUTUBE_SHORTS', 'CHANNEL_WHATSAPP', 
                        'SCHEDULER_TRIGGERS', 'POSTING_TIMES', 'postingTimes'
                    ];
                    
                    const configMap = await getMergedConfigs(account.id, relevantKeys);
                    const isActive = configMap['isActive'] !== false;
                    // schedulerEnabled: default TRUE se nunca foi configurado (undefined)
                    const schedulerEnabled = configMap['schedulerEnabled'] !== false;
                    
                    // Helper para normalizar valores de canal (aceita boolean ou string "true")
                    const isTrue = (val: any) => val === true || val === 'true';

                    const channels = {
                        feed: isTrue(configMap['CHANNEL_INSTAGRAM_FEED']),
                        story: isTrue(configMap['CHANNEL_INSTAGRAM_STORY']),
                        reels: isTrue(configMap['CHANNEL_INSTAGRAM_REELS']),
                        yt: isTrue(configMap['CHANNEL_YOUTUBE_SHORTS']),
                        wa: isTrue(configMap['CHANNEL_WHATSAPP'])
                    };

                    const isAnyChannelEnabled = Object.values(channels).some(v => v === true);

                    // Log detalhado para diagnóstico
                    console.log(`  [${account.id}] status: isActive=${isActive}, schedulerEnabled=${schedulerEnabled}, channels={feed:${channels.feed},story:${channels.story},reels:${channels.reels},yt:${channels.yt},wa:${channels.wa}}`);

                    if (!isActive) {
                        console.log(`  [${account.id}] ⏭️ IGNORADO: isActive=false`);
                        continue;
                    }
                    if (!schedulerEnabled) {
                        console.log(`  [${account.id}] ⏭️ IGNORADO: schedulerEnabled=false`);
                        continue;
                    }
                    if (!isAnyChannelEnabled) {
                        console.log(`  [${account.id}] ⏭️ IGNORADO: nenhum canal ativo (feed=${channels.feed}, story=${channels.story}, reels=${channels.reels}, yt=${channels.yt}, wa=${channels.wa})`);
                        continue;
                    }

                    let shouldRunNow = false;
                    let matchedTrigger: any = null;
                    
                    // Sempre carregar os triggers frescos do banco para evitar ghost triggers
                    const rawTriggers = configMap['SCHEDULER_TRIGGERS'];
                    const triggers: any[] = Array.isArray(rawTriggers) ? rawTriggers : [];

                    console.log(`  [${account.id}] triggers encontrados: ${triggers.length} — ${JSON.stringify(triggers.map(t => ({ type: t.type, time: t.time, days: t.days, value: t.value })))}`);

                    if (triggers.length > 0) {
                        try {

                            for (const trigger of triggers) {
                                let match = false;
                                if (trigger.type === 'minutes') {
                                    const mins = parseInt(trigger.value);
                                    match = (mins > 0 && brM % mins === 0);
                                } else if (trigger.type === 'hours') {
                                    const hrs = parseInt(trigger.value);
                                    match = (hrs > 0 && brH % hrs === 0 && brM === (trigger.minute ?? 0));
                                } else if (trigger.type === 'days') {
                                    match = (trigger.value === brTime);
                                } else if (trigger.type === 'weekly') {
                                    // Tipo semanal: verifica dias da semana (0=Dom..6=Sáb) e horário
                                    const dayOfWeek = nowBrRef.getDay(); // 0=Dom, 1=Seg...
                                    const days: number[] = Array.isArray(trigger.days) ? trigger.days : [];
                                    const triggerTime = trigger.time || trigger.value || '00:00';
                                    match = days.includes(dayOfWeek) && (triggerTime === brTime);
                                    console.log(`  [${account.id}] weekly check: dayOfWeek=${dayOfWeek} in [${days}]=${days.includes(dayOfWeek)}, time=${triggerTime}===${brTime} -> ${match}`);
                                } else if (trigger.type === 'cron') {
                                    match = matchesCron(trigger.value, now);
                                }

                                if (match) {
                                    shouldRunNow = true;
                                    matchedTrigger = { type: trigger.type, value: trigger.value || trigger.time };
                                    
                                    await prisma.auditLog.create({
                                        data: {
                                            action: 'SCHEDULER_MATCHED',
                                            details: { accountId: account.id, triggerType: trigger.type, value: trigger.value, time: brTime }
                                        }
                                    }).catch(() => {});
                                    break;
                                }
                            }
                        } catch (e) {
                            console.error(`  [${account.id}] ❌ Erro triggers:`, e);
                        }
                    } else {
                        console.log(`  [${account.id}] ⚠️ Nenhum trigger configurado — account não será executada. Configure a agenda na tela de Agendamento.`);
                    }

                    // REMOVIDO: Fallback para POSTING_TIMES que causava execuções não autorizadas
                    // Se não há triggers configurados, a conta simplesmente não executa.

                    if (shouldRunNow) {
                        console.log(`  [${account.id}] ✅ Gatilho acionado! (${matchedTrigger.type}=${matchedTrigger.value})`);
                        accountsToRun.push(account);
                    }

                } catch (err) {
                    console.error(`  [${account.id}] ❌ Erro:`, err);
                }
            }

            if (accountsToRun.length > 0) {
                for (const account of accountsToRun) {
                    try {
                        console.log(`  🚀 Iniciando pipeline em background: ${account.id}`);
                        
                        runPipeline(account.id).then(() => {
                            console.log(`  ✅ Pipeline finalizado para ${account.id}`);
                            prisma.auditLog.create({
                                data: {
                                    action: 'PIPELINE_SCHEDULER_SUCCESS',
                                    details: { accountId: account.id, time: new Date().toISOString() }
                                }
                            }).catch(() => {});
                        }).catch((err: any) => {
                            console.error(`  ❌ Falha no pipeline: ${account.id}`, err);
                            prisma.auditLog.create({
                                data: {
                                    action: 'PIPELINE_SCHEDULER_ERROR',
                                    details: { accountId: account.id, error: err.message }
                                }
                            }).catch(() => {});
                        });

                    } catch (err: any) {
                         console.error(`  ❌ Erro ao disparar pipeline para ${account.id}:`, err);
                    }
                }
            }


            // Sincroniza para o próximo minuto redondo
            const nextCheck = 60000 - (Date.now() % 60000);
            await new Promise(resolve => setTimeout(resolve, nextCheck));
        }
    })();


    console.log('🚀 Scheduler em execução (Polling * * * * *). Mantenha este processo ativo.');

    // Limpeza periódica de runs travados (cada 10 minutos)
    cron.schedule('*/10 * * * *', async () => {
        await cleanupStuckRuns();
    });


    // Limpeza de imagens do Storage (todo dia à meia-noite)
    cron.schedule('0 0 * * *', async () => {
        console.log('\n🗑️ Iniciando limpeza noturna de imagens...');
        await cleanupOldSlides();
    });

    // Limpeza de Banco de Dados (todo dia à meia-noite)
    cron.schedule('0 0 * * *', async () => {
        await cleanupDatabase();
    });

    // Chamadas de limpeza iniciais ao subir
    await cleanupOldSlides();
    await cleanupDatabase();
}

/**
 * Limpa runs que ficaram presos no status 'RUNNING'
 */
async function cleanupStuckRuns() {
    console.log('Sweep: Verificando runs travados (timeout > 10m)...');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    try {
        const result = await prisma.agentRun.updateMany({
            where: {
                status: RunStatus.RUNNING,
                startedAt: { lt: tenMinutesAgo }
            },
            data: {
                status: RunStatus.FAILED,
                error: 'Run interrompido ou timeout excedido (limpeza automática).',
                finishedAt: new Date()
            }
        });

        if (result.count > 0) {
            console.log(`✅ ${result.count} runs travados foram corrigidos.`);
        }
    } catch (err) {
        console.error('❌ Erro na limpeza automática:', err);
    }
}

/**
 * Apaga imagens do bucket `carousel-slides` com mais de 24 horas.
 */
async function cleanupOldSlides() {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.warn('⚠️ Supabase client not initialized (missing env vars). skipping cleanupOldSlides.');
        return;
    }

    try {
        const { data: files, error: listErr } = await supabase.storage
            .from(SLIDE_BUCKET)
            .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } });

        if (listErr) { console.error('❌ Erro ao listar slides:', listErr.message); return; }
        if (!files || files.length === 0) { console.log('✅ Nenhuma imagem antiga no storage.'); return; }

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const toDelete = files
            .filter((f: any) => f.created_at && new Date(f.created_at) < oneDayAgo)
            .map((f: any) => f.name);

        if (toDelete.length === 0) {
            console.log(`✅ Nenhuma imagem com mais de 24h. Total no bucket: ${files.length}`);
            return;
        }

        const { error: delErr } = await supabase.storage
            .from(SLIDE_BUCKET)
            .remove(toDelete);

        if (delErr) {
            console.error('❌ Erro ao apagar slides:', delErr.message);
        } else {
            console.log(`✅ ${toDelete.length} imagens antigas apagadas do Storage.`);
        }
    } catch (err) {
        console.error('❌ Erro na limpeza de slides:', err);
    }
}

/**
 * Apaga logs e runs antigos (> 2 dias) para manter o banco leve.
 */
async function cleanupDatabase() {
    console.log('\n🗑️ Iniciando limpeza de dados históricos (AuditLog / AgentRun > 2 dias)...');
    try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

        const runCount = await prisma.agentRun.deleteMany({
            where: { startedAt: { lt: twoDaysAgo } }
        });
        
        const logCount = await prisma.auditLog.deleteMany({
            where: { createdAt: { lt: twoDaysAgo } }
        });

        console.log(`✅ Limpeza de Banco concluída: ${runCount.count} AgentRuns e ${logCount.count} AuditLogs removidos.`);
    } catch (err) {
        console.error('❌ Erro na limpeza do banco de dados:', err);
    }
}

startScheduler().catch(err => {
    console.error('❌ Erro ao iniciar scheduler:', err);
    process.exit(1);
});
