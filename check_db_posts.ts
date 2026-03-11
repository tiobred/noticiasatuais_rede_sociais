
import prisma from './lib/db';

async function main() {
    console.log('--- DB Check ---');
    try {
        const accId = 'Tiobred';
        const allPosts = await prisma.post.findMany({
            where: { accountId: accId },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const jornada = allPosts.filter(p => p.sourceName.toLowerCase().includes('jornadatop'));
        console.log(`Encontrados ${jornada.length} posts para jornadatop`);

        for (const p of jornada) {
            console.log(`[${p.createdAt.toISOString()}] ID: ${p.id}, Meta: ${JSON.stringify(p.metadata)}`);
        }
    } catch (e) {
        console.error('Error checking DB:', e);
    }
}

main();
