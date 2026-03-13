const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.auditLog.findMany({
        where: { action: 'SETTINGS_UPDATE' },
        orderBy: { createdAt: 'desc' }
    });
    
    const promoLogs = logs.filter(l => l.details && l.details.accountId === 'promo');
    
    console.log(`--- Audit Logs for account: promo ---`);
    promoLogs.forEach(l => {
        console.log(`Date: ${l.createdAt}, Keys: ${JSON.stringify(l.details.keys)}`);
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
