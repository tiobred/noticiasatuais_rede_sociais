
import { PrismaClient, RunStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.post.groupBy({
        by: ['status'],
        _count: { id: true },
    });
    console.log('Post Status Counts:', JSON.stringify(posts, null, 2));

    const runs = await prisma.agentRun.findMany({
        where: { status: RunStatus.RUNNING },
    });
    console.log('Running Agent Runs:', JSON.stringify(runs, null, 2));

    if (runs.length > 0) {
        console.log(`Cleaning up ${runs.length} stuck runs...`);
        await prisma.agentRun.updateMany({
            where: { status: RunStatus.RUNNING },
            data: { status: RunStatus.FAILED, error: 'Stuck process cleaned up by diagnostic script' },
        });
        console.log('Cleanup done.');
    }

    const lastPubs = await prisma.socialPublication.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { post: { select: { title: true } } }
    });
    console.log('Last 5 Publications:', JSON.stringify(lastPubs, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
