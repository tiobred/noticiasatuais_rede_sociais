import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/db';
import { runPipeline } from '../lib/agents/orchestrator';
import { RunStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

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
async function startScheduler() {
    console.log('\n🕒 Iniciando serviço de agendamento (Modo Multi-Contas)...');

    // Limpeza inicial de possíveis runs travados
    await cleanupStuckRuns();

    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    let allAccounts: { id: string, name: string }[] = [];
    try {
        allAccounts = JSON.parse(allAccountsStr);
    } catch (e) { }

    console.log(`📌 Encontradas ${allAccounts.length} contas configuradas no .env.`);

    // 1. Cron Job dinâmico que checa minuto a minuto se há post pendente para alguma conta
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;

        const accountsToRun = [];

        for (const account of allAccounts) {
            try {
                // Recupera configurações atualizadas para esta conta especifica
                const configs = await prisma.systemConfig.findMany({ where: { accountId: account.id } });
                const configMap = configs.reduce((acc, curr) => {
                    acc[curr.key] = curr.value;
                    return acc;
                }, {} as Record<string, any>);

                if (configMap['isActive'] === false) {
                    continue; // Conta desativada
                }

                if (configMap['schedulerEnabled'] === false) {
                    continue; // Agendamento automático desativado pra esta conta
                }

                const isFeedEnabled = configMap['CHANNEL_INSTAGRAM_FEED'] === true;
                const isStoryEnabled = configMap['CHANNEL_INSTAGRAM_STORY'] === true;
                const isWhatsappEnabled = configMap['CHANNEL_WHATSAPP'] === true;

                if (!isFeedEnabled && !isStoryEnabled && !isWhatsappEnabled) {
                    continue; // Nenhum canal de publicação ativo
                }

                const postingTimesConf = configMap['postingTimes'] || {};
                const postingTimes = postingTimesConf['instagram'] || [];

                if (postingTimes.includes(currentTime)) {
                    accountsToRun.push(account);
                }

            } catch (err) {
                console.error(`❌ Falha ao processar config job scheduler para [${account.id}]:`, err);
            }
        }

        if (accountsToRun.length > 0) {
            // Executa em background de forma sequencial para não bloquear outras verificações de cron
            (async () => {
                const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                for (let i = 0; i < accountsToRun.length; i++) {
                    const account = accountsToRun[i];
                    console.log(`\n🚀 [${now.toLocaleTimeString()}] Iniciando pipeline agendado para a conta: ${account.name} (${account.id}) @ ${currentTime}`);

                    try {
                        const result = await runPipeline(account.id);
                        console.log(`✅ Pipeline da conta [${account.id}] concluído. Posts encontrados: ${result.postsFound}, Novos: ${result.postsNew}, Publicados: ${result.postsPublished}`);
                    } catch (err) {
                        console.error(`❌ Erro durante execução agendada para [${account.id}]:`, err);
                    }

                    // Aguarda 1 minuto entre execuções caso ainda haja contas neste lote
                    if (i < accountsToRun.length - 1) {
                        console.log(`⏳ Aguardando 1 minuto antes de executar o próximo pipeline agendado para evitar bloqueios...`);
                        await sleep(60000);
                    }
                }
            })();
        }
    });

    console.log('🚀 Scheduler em execução (Polling * * * * *). Mantenha este processo ativo.');

    // Limpeza periódica de runs travados (cada 1 hora)
    cron.schedule('0 * * * *', async () => {
        await cleanupStuckRuns();
    });

    // Limpeza de imagens do Storage (todo dia à meia-noite)
    // Apaga slides gerados há mais de 24h — posts no banco são mantidos
    cron.schedule('0 0 * * *', async () => {
        console.log('\n🗑️ Iniciando limpeza noturna de imagens...');
        await cleanupOldSlides();
    });

    // Limpeza inicial ao subir (remove imagens de dias anteriores)
    await cleanupOldSlides();
}

/**
 * Limpa runs que ficaram presos no status 'RUNNING'
 */
async function cleanupStuckRuns() {
    console.log('Sweep: Verificando runs travados (timeout > 15m)...');
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    try {
        const result = await prisma.agentRun.updateMany({
            where: {
                status: RunStatus.RUNNING,
                startedAt: { lt: fifteenMinutesAgo }
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
 * Os Posts e publicações no banco de dados são mantidos intactos.
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

startScheduler().catch(err => {
    console.error('❌ Erro ao iniciar scheduler:', err);
    process.exit(1);
});
