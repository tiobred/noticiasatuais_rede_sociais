import prisma from '../lib/db';

async function main() {
    console.log('🔍 Buscando posts de @jornadatop no banco de dados...');
    const posts = await prisma.post.findMany({
        where: { sourceUrl: { contains: 'jornadatop' } },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    if (posts.length === 0) {
        // Tentar por sourceName se sourceUrl falhar
        const postsByName = await prisma.post.findMany({
            where: { sourceName: { contains: 'jornadatop' } },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        if (postsByName.length === 0) {
            console.log('❌ Nenhum post de @jornadatop encontrado (nem por URL nem por Nome).');
        } else {
            console.log(`✅ Encontrados ${postsByName.length} posts de @jornadatop (por Nome):`);
            postsByName.forEach((p: any) => {
                console.log(`- [${p.status}] ${p.title} (ID: ${p.id})`);
            });
        }
    } else {
        console.log(`✅ Encontrados ${posts.length} posts de @jornadatop (por URL):`);
        posts.forEach((p: any) => {
            console.log(`- [${p.status}] ${p.title} (ID: ${p.id})`);
        });
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
