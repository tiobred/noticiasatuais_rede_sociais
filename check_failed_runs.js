const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Failed AgentRuns ---');
    const failedRuns = await prisma.agentRun.findMany({
        where: { status: 'FAILED' },
        orderBy: { startedAt: 'desc' },
        take: 10
    });
    console.log(JSON.stringify(failedRuns, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
