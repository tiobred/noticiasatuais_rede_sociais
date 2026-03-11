
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Force cleaning AgentRun table...');
    const result = await prisma.agentRun.updateMany({
        where: { status: 'RUNNING' },
        data: {
            status: 'FAILED',
            error: 'Force cleaned by script'
        }
    });
    console.log(`Cleaned ${result.count} running entries.`);

    const processedCount = await prisma.post.count({
        where: { status: 'PROCESSED', accountId: 'promo' }
    });
    console.log(`Ready to publish ${processedCount} posts for 'promo'.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
