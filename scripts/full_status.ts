import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const stats = await prisma.post.groupBy({
        by: ['status'],
        _count: { id: true }
    });
    console.log('Post Statuses:', stats);

    const recentPubs = await prisma.socialPublication.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { post: true }
    });
    console.log('Recent Publications:', JSON.stringify(recentPubs, null, 2));

    const runningAgents = await prisma.agentRun.findMany({
        where: { status: 'RUNNING' }
    });
    console.log('Running Agents:', runningAgents.length);
}
main().finally(() => prisma.$disconnect());
