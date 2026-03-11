const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- RESUMO GERAL DO PROJETO ---');

    // Status dos Agentes
    const agentRuns = await prisma.agentRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5
    });
    console.log('\n--- ÚLTIMAS EXECUÇÕES DOS AGENTES ---');
    agentRuns.forEach(run => {
        console.log(`[${run.startedAt.toISOString()}] ${run.agentName}: ${run.status} ${run.error ? '(' + run.error.slice(0, 50) + ')' : ''}`);
    });

    // Status dos Posts
    const postCounts = await prisma.post.groupBy({
        by: ['accountId', 'status'],
        _count: { _all: true }
    });

    console.log('\n--- STATUS DOS POSTS POR CONTA ---');
    console.table(postCounts.map(c => ({
        Conta: c.accountId,
        Status: c.status,
        Quantidade: c._count._all
    })));

    // Publicações recentes
    const publications = await prisma.socialPublication.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log('\n---ÚLTIMAS PUBLICAÇÕES ---');
    publications.forEach(p => {
        console.log(`[${p.createdAt.toISOString()}] Account: ${p.accountId} Channel: ${p.channel} Status: ${p.status}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
