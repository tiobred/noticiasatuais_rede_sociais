
import prisma from './lib/db';

async function checkPosts() {
    const accountId = 'Tiobred';
    const posts = await prisma.post.findMany({
        where: {
            accountId
        },
        take: 50,
        orderBy: { createdAt: 'desc' }
    });

    const jornadaPosts = posts.filter(p => p.sourceName.includes('jornadatop'));

    console.log(`Encontrados ${jornadaPosts.length} posts para @jornadatop (Account: ${accountId})`);
    jornadaPosts.forEach(p => {
        console.log(`ID: ${p.id}, SourceId: ${p.sourceId}, Metadata: ${JSON.stringify(p.metadata)}`);
    });
}

checkPosts().catch(console.error);
