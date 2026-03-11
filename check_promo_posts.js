const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Posts for account: promo ---');
    const posts = await prisma.post.findMany({
        where: { accountId: 'promo' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { publications: true }
    });

    if (posts.length === 0) {
        console.log('No posts found for promo.');
    } else {
        posts.forEach(p => {
            console.log(`ID: ${p.id} | Title: ${p.title} | Status: ${p.status}`);
            p.publications.forEach(pub => {
                console.log(`  - Pub: ${pub.channel} | Status: ${pub.status} | Error: ${pub.error || 'None'}`);
            });
        });
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
