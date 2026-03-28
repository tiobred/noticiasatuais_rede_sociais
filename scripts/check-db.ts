import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SystemConfig (SCHEDULER_TRIGGERS) ---');
    const configs = await prisma.systemConfig.findMany({
        where: { key: 'SCHEDULER_TRIGGERS' }
    });
    console.log(JSON.stringify(configs, null, 2));

    console.log('\n--- AuditLog (Recent relevant actions) ---');
    const logs = await prisma.auditLog.findMany({
        where: { action: { startsWith: 'SCHEDULER' } },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    console.log(JSON.stringify(logs, null, 2));

    console.log('\n--- AgentRun (Last 10) ---');
    const runs = await prisma.agentRun.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' }
    });
    console.log(JSON.stringify(runs, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
