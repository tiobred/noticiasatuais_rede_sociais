import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- PUBLICACÕES RECENTES ---');
    const pubs = await prisma.socialPublication.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
            post: true
        }
    });

    for (const pub of pubs) {
        console.log(`[${pub.createdAt.toISOString()}] Account: ${pub.accountId}, Channel: ${pub.channel}, Status: ${pub.status}, ExternalID: ${pub.externalId}`);
        console.log(`   Post Title: ${pub.post?.title}`);
    }

    console.log('\n--- AGENT RUNS RECENTES ---');
    const runs = await prisma.agentRun.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' }
    });

    for (const run of runs) {
        console.log(`[${run.startedAt.toISOString()}] Status: ${run.status}, Found: ${run.postsFound}, New: ${run.postsNew}, Published: ${run.postsPublished}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
