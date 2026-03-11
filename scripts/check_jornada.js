const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Buscando posts de @jornadatop no banco de dados (JS)...');
    try {
        const posts = await prisma.post.findMany({
            where: {
                OR: [
                    { originalUrl: { contains: 'jornadatop' } },
                    { sourceName: { contains: 'jornadatop' } }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        if (posts.length === 0) {
            console.log('❌ Nenhum post de @jornadatop encontrado.');
        } else {
            console.log(`✅ Encontrados ${posts.length} posts de @jornadatop:`);
            posts.forEach(p => {
                console.log(`- [${p.status}] ${p.title} | Source: ${p.sourceName} | Date: ${p.createdAt}`);
            });
        }
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
