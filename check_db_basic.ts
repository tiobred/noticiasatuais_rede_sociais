
import prisma from './lib/db';

async function main() {
    console.log('--- DB Check Basic (with ts-ignore) ---');
    try {
        const allPosts = await prisma.post.findMany({
            orderBy: { createdAt: 'desc' },
            take: 200
        });

        console.log(`Total retrieved: ${allPosts.length}`);
        const jornada = allPosts.filter(p => p.sourceName && p.sourceName.toLowerCase().includes('jornadatop'));
        console.log(`Encontrados ${jornada.length} posts para jornadatop`);

        for (const p of jornada) {
            // @ts-ignore
            console.log(`[${p.createdAt.toISOString()}] ID: ${p.id}, Account: ${p.accountId}, Meta: ${JSON.stringify(p.metadata)}`);
        }
    } catch (e) {
        console.error('Error checking DB:', e);
    }
}

main();
