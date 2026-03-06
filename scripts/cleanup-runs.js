const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupStuckRuns() {
    console.log('🧹 Iniciando limpeza de runs travados (JS)...');

    // 30 minutos atrás
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
        console.log('--- Verificando registros no banco ---');
        const stuckRuns = await prisma.agentRun.findMany({
            where: {
                status: 'RUNNING',
                startedAt: {
                    lt: thirtyMinutesAgo
                }
            }
        });

        console.log(`Encontrados ${stuckRuns.length} runs para processar.`);

        if (stuckRuns.length === 0) {
            console.log('✅ Nenhum run travado encontrado.');
            return;
        }

        console.log(`⚠️ Atualizando ${stuckRuns.length} runs...`);

        const result = await prisma.agentRun.updateMany({
            where: {
                id: {
                    in: stuckRuns.map(r => r.id)
                }
            },
            data: {
                status: 'FAILED',
                error: 'Run interrompido ou timeout excedido.',
                finishedAt: new Date()
            }
        });

        console.log(`✅ ${result.count} runs foram marcados como FALHOS.`);
    } catch (err) {
        console.error('❌ Erro na limpeza:', err);
    } finally {
        await prisma.$disconnect();
        console.log('--- Fim do script ---');
    }
}

cleanupStuckRuns();
