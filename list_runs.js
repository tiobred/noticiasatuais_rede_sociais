const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Recent AgentRuns (ALL) ---');
    const runs = await prisma.agentRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 20
    });
    console.log(JSON.stringify(runs, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
