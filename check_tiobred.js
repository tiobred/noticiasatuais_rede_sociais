const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const keys = [
        'isActive',
        'CHANNEL_INSTAGRAM_FEED',
        'CHANNEL_INSTAGRAM_STORY',
        'CHANNEL_INSTAGRAM_REELS',
        'CHANNEL_WHATSAPP'
    ];

    console.log('--- SystemConfig Tiobred ---');
    const configs = await prisma.systemConfig.findMany({
        where: { accountId: 'Tiobred', key: { in: keys } }
    });
    console.log(JSON.stringify(configs, null, 2));

    console.log('\n--- Recent AgentRuns for Tiobred ---');
    const runs = await prisma.agentRun.findMany({
        where: { agentName: 'orchestrator_Tiobred' },
        orderBy: { startedAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(runs, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
