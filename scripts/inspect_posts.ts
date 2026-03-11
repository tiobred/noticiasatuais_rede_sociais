
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.post.findMany({
        where: { status: 'PROCESSED' },
        select: { id: true, accountId: true, title: true, imageUrl: true, metadata: true },
        take: 20
    });
    console.log('Processed Posts:', JSON.stringify(posts, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
