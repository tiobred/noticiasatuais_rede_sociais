const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const runId = 'cmmi66p6o00005pc1my9sizet';
    console.log('--- Checking AgentRun:', runId, '---');
    const run = await prisma.agentRun.findUnique({
        where: { id: runId }
    });
    console.log(JSON.stringify(run, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
