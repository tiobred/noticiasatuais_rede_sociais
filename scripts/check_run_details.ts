import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching recent Agent Runs...");
    const runs = await prisma.agentRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5
    });
    console.dir(runs, { depth: null });

    console.log("\nConfig values for promo and tiobred:");
    const configs = await prisma.systemConfig.findMany({
        where: { accountId: { in: ['global', 'promo', 'tiobred'] }, key: { in: ['PUBLISH_NEWS_ENABLED', 'PUBLISH_ORIGINALS_ENABLED', 'isActive'] } }
    });
    console.dir(configs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
