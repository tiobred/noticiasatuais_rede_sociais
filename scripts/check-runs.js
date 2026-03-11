const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const runs = await prisma.agentRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 20
    });
    console.log('--- AGENT RUNS ---');
    runs.forEach(r => {
        console.log(`- ID: ${r.id}, Name: ${r.agentName}, Status: ${r.status}, Found: ${r.postsFound}, Published: ${r.postsPublished}`);
    });
}

main().finally(() => prisma.$disconnect());
