import prisma from '../lib/db';
import { RunStatus } from '@prisma/client';

/**
 * Script utilitário para limpar runs que ficaram presos no status 'RUNNING'
 */
async function cleanupStuckRuns() {
    console.log('🧹 Iniciando limpeza de runs travados...');

    // Consideramos "travados" runs que começaram há mais de 30 minutos e ainda estão RUNNING
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const stuckRuns = await prisma.agentRun.findMany({
        where: {
            status: RunStatus.RUNNING,
            startedAt: {
                lt: thirtyMinutesAgo
            }
        }
    });

    if (stuckRuns.length === 0) {
        console.log('✅ Nenhum run travado encontrado.');
        return;
    }

    console.log(`⚠️ Encontrados ${stuckRuns.length} runs travados. Atualizando para FAILED...`);

    const result = await prisma.agentRun.updateMany({
        where: {
            id: {
                in: stuckRuns.map(r => r.id)
            }
        },
        data: {
            status: RunStatus.FAILED,
            error: 'Run interrompido ou timeout excedido.',
            finishedAt: new Date()
        }
    });

    console.log(`✅ ${result.count} runs foram marcados como FALHOS.`);
}

cleanupStuckRuns()
    .catch(err => {
        console.error('❌ Erro na limpeza:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
