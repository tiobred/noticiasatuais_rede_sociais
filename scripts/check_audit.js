const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.auditLog.findMany({
        where: { action: 'SETTINGS_UPDATE' },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    
    console.log(`--- Recent Audit Logs for SETTINGS_UPDATE ---`);
    logs.forEach(l => {
        console.log(`ID: ${l.id}, Date: ${l.createdAt}`);
        console.log(`Details: ${JSON.stringify(l.details)}`);
        console.log('---');
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
