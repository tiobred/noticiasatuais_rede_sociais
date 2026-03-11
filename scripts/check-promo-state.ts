import prisma from '../lib/db';

async function main() {
    console.log('--- SocialPublications for "promo" ---');
    const pubs = await prisma.socialPublication.findMany({
        where: { accountId: 'promo' },
        orderBy: { publishedAt: 'desc' },
        take: 10
    });
    console.log(JSON.stringify(pubs, null, 2));

    console.log('\n--- PROCESSED Posts for "promo" ---');
    const posts = await prisma.post.findMany({
        where: {
            accountId: 'promo',
            status: 'PROCESSED'
        },
        take: 10
    });
    console.log(JSON.stringify(posts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
