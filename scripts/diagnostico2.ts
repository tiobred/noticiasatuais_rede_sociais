import 'dotenv/config';
import { PrismaClient, PostStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Conta promo tem 5 posts PROCESSED - vamos ver o que acontece
    console.log('\n=== Posts PROCESSED da conta promo ===\n');
    
    const posts = await prisma.post.findMany({
        where: { accountId: 'promo', status: PostStatus.PROCESSED },
        orderBy: { createdAt: 'asc' },
        take: 5
    });
    
    posts.forEach(p => {
        const meta = p.metadata as any;
        console.log(`Post ID: ${p.id}`);
        console.log(`  Title: ${p.title?.slice(0, 60)}`);
        console.log(`  postOriginal: ${meta?.postOriginal || false}`);
        console.log(`  targetChannels: ${JSON.stringify(meta?.targetChannels)}`);
        console.log(`  imageUrl: ${p.imageUrl?.slice(0, 60) || 'null'}`);
        
        // Verificar publicações já existentes
        console.log(`  ---`);
    });
    
    // Ver publicações existentes
    console.log('\n=== SocialPublications existentes (promo) ===\n');
    const pubs = await prisma.socialPublication.findMany({
        where: { accountId: 'promo' },
        orderBy: { createdAt: 'desc' }
    });
    pubs.forEach(p => {
        console.log(`  channel=${p.channel} postId=${p.postId} status=${p.status} err=${p.error?.slice(0, 60) || '-'}`);
    });
    
    // Ver publicações tiobred
    console.log('\n=== Posts PROCESSED da conta tiobred ===\n');
    const tPosts = await prisma.post.findMany({
        where: { accountId: 'tiobred', status: PostStatus.PROCESSED },
        orderBy: { createdAt: 'asc' },
        take: 5
    });
    tPosts.forEach(p => {
        const meta = p.metadata as any;
        console.log(`Post ID: ${p.id}`);
        console.log(`  Title: ${p.title?.slice(0, 60)}`);
        console.log(`  postOriginal: ${meta?.postOriginal || false}`);
        console.log(`  targetChannels: ${JSON.stringify(meta?.targetChannels)}`);
    });
    
    // Ver publicações tiobred
    console.log('\n=== SocialPublications existentes (tiobred) ===\n');
    const tPubs = await prisma.socialPublication.findMany({
        where: { accountId: 'tiobred' },
        orderBy: { createdAt: 'desc' }
    });
    tPubs.forEach(p => {
        console.log(`  channel=${p.channel} postId=${p.postId} status=${p.status} err=${p.error?.slice(0, 60) || '-'}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
