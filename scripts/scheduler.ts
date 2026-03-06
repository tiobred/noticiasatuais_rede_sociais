import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/db';
import { runPipeline } from '../lib/agents/orchestrator';
import { RunStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const SLIDE_BUCKET = 'carousel-slides';

/**
 * Scheduler Service — gerencia o agendamento de postagens baseado no SystemConfig
 */
async function startScheduler() {
    console.log('\n🕒 Iniciando serviço de agendamento...');

    // Limpeza inicial de possíveis runs travados
    await cleanupStuckRuns();

    // 1. Buscar horários do banco
    const scheduleConfig = await prisma.systemConfig.findUnique({
        where: { key: 'POSTING_TIMES' }
    });

    const times: string[] = (scheduleConfig?.value as string[]) || ['08:00', '13:00', '21:00'];
    console.log(`📌 Horários configurados: ${times.join(', ')}`);

    // 2. Agendar cada horário
    times.forEach(time => {
        const [hour, minute] = time.split(':');
        const cronExpr = `${minute} ${hour} * * *`;

        console.log(`📅 Agendado: ${cronExpr} (Todo dia às ${time})`);

        cron.schedule(cronExpr, async () => {
            const jobConfig = await prisma.systemConfig.findUnique({ where: { key: 'JOB_SCHEDULER' } });
            if (jobConfig && jobConfig.value === false) {
                console.log(`⏸️ [${new Date().toLocaleTimeString()}] Pipeline agendado pulado (Desativado no painel).`);
                return;
            }

            console.log(`\n🚀 [${new Date().toLocaleTimeString()}] Iniciando pipeline agendado...`);
            try {
                const result = await runPipeline();
                console.log(`✅ Pipeline concluído. Posts encontrados: ${result.postsFound}, Novos: ${result.postsNew}, Publicados: ${result.postsPublished}`);
            } catch (err) {
                console.error('❌ Erro durante execução agendada:', err);
            }
        });
    });

    console.log('🚀 Scheduler em execução. Mantenha este processo ativo.');

    // Limpeza periódica de runs travados (cada 1 hora)
    cron.schedule('0 * * * *', async () => {
        const jobConfig = await prisma.systemConfig.findUnique({ where: { key: 'JOB_CLEANUP' } });
        if (jobConfig && jobConfig.value === false) return;
        await cleanupStuckRuns();
    });

    // Limpeza de imagens do Storage (todo dia à meia-noite)
    // Apaga slides gerados há mais de 24h — posts no banco são mantidos
    cron.schedule('0 0 * * *', async () => {
        const jobConfig = await prisma.systemConfig.findUnique({ where: { key: 'JOB_CLEANUP' } });
        if (jobConfig && jobConfig.value === false) {
            console.log('⏸️ Limpeza noturna pulada (Desativada no painel).');
            return;
        }
        console.log('\n🗑️  Iniciando limpeza noturna de imagens...');
        await cleanupOldSlides();
    });

    // Limpeza inicial ao subir (remove imagens de dias anteriores)
    await cleanupOldSlides();
}

/**
 * Limpa runs que ficaram presos no status 'RUNNING'
 */
async function cleanupStuckRuns() {
    console.log('🧹 Verificando runs travados...');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
        const result = await prisma.agentRun.updateMany({
            where: {
                status: RunStatus.RUNNING,
                startedAt: { lt: thirtyMinutesAgo }
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
    try {
        const { data: files, error: listErr } = await supabase.storage
            .from(SLIDE_BUCKET)
            .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } });

        if (listErr) { console.error('❌ Erro ao listar slides:', listErr.message); return; }
        if (!files || files.length === 0) { console.log('✅ Nenhuma imagem antiga no storage.'); return; }

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const toDelete = files
            .filter(f => f.created_at && new Date(f.created_at) < oneDayAgo)
            .map(f => f.name);

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
