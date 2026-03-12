import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                action: 'SETTINGS_UPDATE'
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });
        console.log('--- RECENT AUDIT LOGS (SETTINGS_UPDATE) ---');
        logs.forEach(l => {
            console.log(`Time: ${l.createdAt} | Details: ${JSON.stringify(l.details)}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
