import prisma from '../lib/db';

async function checkRuns() {
    try {
        const runs = await prisma.agentRun.findMany({
            where: { agentName: { startsWith: 'orchestrator_' } },
            orderBy: { startedAt: 'desc' },
            take: 10
        });
        console.log('--- ÚLTIMAS 10 EXECUÇÕES DO ORQUESTRADOR ---');
        runs.forEach(run => {
            console.log(`ID: ${run.id} | Agent: ${run.agentName} | Status: ${run.status} | Found: ${run.postsFound} | New: ${run.postsNew} | StartedAt: ${run.startedAt.toISOString()}`);
            if (run.error) {
                console.log(`   ERROR: ${run.error}`);
            }
        });
    } catch (error) {
        console.error('Erro ao consultar AgentRun:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRuns();
