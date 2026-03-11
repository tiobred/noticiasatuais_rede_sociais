const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- AgentRuns for account: promo ---');
    const runs = await prisma.agentRun.findMany({
        where: { agentName: 'orchestrator_promo' },
        orderBy: { startedAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(runs, null, 2));

    console.log('\n--- SystemConfig for account: promo ---');
    const configs = await prisma.systemConfig.findMany({
        where: { accountId: 'promo' }
    });
    console.log(JSON.stringify(configs, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
