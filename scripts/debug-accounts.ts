import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.post.groupBy({
        by: ['accountId'],
        _count: {
            id: true
        }
    });

    console.log('--- Post counts by Account ID ---');
    console.log(JSON.stringify(accounts, null, 2));

    const pendingPosts = await prisma.post.findMany({
        where: {
            status: 'PROCESSED' as any
        },
        take: 5
    });

    console.log('--- Sample PROCESSED posts ---');
    pendingPosts.forEach(p => {
        console.log(`ID: ${p.id}, AccountID: ${p.accountId}, Title: ${p.title}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
