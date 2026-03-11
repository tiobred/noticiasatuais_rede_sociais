
import prisma from './lib/db';

async function main() {
    console.log('--- Limpando posts PROCESSED de @jornadatop ---');
    const result = await prisma.post.deleteMany({
        where: {
            sourceName: { contains: 'jornadatop' },
            status: 'PROCESSED'
        }
    });

    console.log(`✅ ${result.count} posts removidos.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
