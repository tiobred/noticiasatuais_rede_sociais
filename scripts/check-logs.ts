
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const logs = await prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' }
        });
        console.log('Last 10 Audit Logs:');
        console.log(JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error fetching logs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
