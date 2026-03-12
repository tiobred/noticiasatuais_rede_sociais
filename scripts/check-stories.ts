import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const publications = await prisma.socialPublication.findMany({
        where: {
            channel: 'INSTAGRAM_STORY' as any,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 10,
    });

    console.log('--- Recent Instagram Story Publications ---');
    publications.forEach(pub => {
        console.log(`ID: ${pub.id}`);
        console.log(`Post ID: ${pub.postId}`);
        console.log(`Account ID: ${pub.accountId}`);
        console.log(`External ID: ${pub.externalId}`);
        console.log(`Status: ${pub.status}`);
        console.log(`Error: ${pub.error}`);
        console.log(`Created At: ${pub.createdAt}`);
        console.log('-----------------------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
