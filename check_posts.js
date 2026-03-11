const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Post Count ---');
    const postCount = await prisma.post.count();
    console.log('Count:', postCount);

    if (postCount > 0) {
        const latest = await prisma.post.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        console.log('Latest Post:', JSON.stringify(latest, null, 2));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
