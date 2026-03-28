import prisma from '../lib/db';

async function main() {
    console.log('\n--- AUDIT LOGS (Scheduler) ---');
    
    const logs = await prisma.auditLog.findMany({
        where: {
            action: { startsWith: 'SCHEDULER_' }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    console.log(JSON.stringify(logs, null, 2));
    console.log('-------------------------------\n');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
