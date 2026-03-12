import prisma from '../lib/db/index';
import { PostStatus } from '@prisma/client';

async function main() {
    console.log('🔄 Resetando os 2 posts mais recentes para PENDING para teste...');
    const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 2
    });

    if (posts.length === 0) {
        console.error('❌ Nenhum post encontrado para resetar.');
        return;
    }

    for (const post of posts) {
        await prisma.post.update({
            where: { id: post.id },
            data: { status: PostStatus.PENDING }
        });
        console.log(`✅ Post [${post.id}] resetado para PENDING: ${post.title}`);
    }
}

main();
