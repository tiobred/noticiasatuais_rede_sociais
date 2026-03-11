const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verificando publicações de @jornadatop...');
    try {
        const posts = await prisma.post.findMany({
            where: {
                sourceName: { contains: 'jornadatop' }
            },
            include: {
                publications: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        posts.forEach(p => {
            console.log(`\nPost: ${p.title} (ID: ${p.id})`);
            console.log(`Status Geral: ${p.status}`);
            if (p.publications.length === 0) {
                console.log('  ⚠️ Nenhuma publicação registrada na tabela SocialPublication!');
            } else {
                p.publications.forEach(pub => {
                    console.log(`  - Canal: ${pub.channel} | Status: ${pub.status} | ID Externo: ${pub.externalId} | Erro: ${pub.error || 'Nenhum'}`);
                });
            }
        });
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
