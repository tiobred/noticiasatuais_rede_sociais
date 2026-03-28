import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today UTC

        const logs = await prisma.auditLog.findMany({
            where: {
                createdAt: {
                    gte: today
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`\n--- Audit Logs from Today (${today.toISOString()}) ---`);
        console.log(`Total logs found: ${logs.length}`);
        
        if (logs.length > 0) {
            logs.forEach(l => {
                console.log(`[${l.createdAt.toISOString()}] ${l.action}`);
                if (l.details) {
                    console.log(`  Details: ${JSON.stringify(l.details)}`);
                }
            });
        } else {
            console.log('No logs found for today.');
        }
        console.log('---------------------------------------------------\n');

    } catch (error) {
        console.error('Error fetching logs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
