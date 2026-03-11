import prisma from '../lib/db';
import { PostStatus } from '@prisma/client';

async function main() {
    const posts = await prisma.post.findMany({
        where: {
            accountId: 'promo',
            status: PostStatus.PUBLISHED
        },
        take: 10
    });
    console.log(JSON.stringify(posts, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
