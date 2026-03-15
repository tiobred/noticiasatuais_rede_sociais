
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Latest Audit Logs ---');
        const logs = await prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' }
        });
        console.log(JSON.stringify(logs, null, 2));

        console.log('\n--- Latest Agent Runs (tiobred) ---');
        const runs = await prisma.agentRun.findMany({
            take: 5,
            orderBy: { startedAt: 'desc' }
        });
        console.log(JSON.stringify(runs, null, 2));
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
