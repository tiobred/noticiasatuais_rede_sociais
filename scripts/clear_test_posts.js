const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Limpando posts de @jornadatop para teste...');
    try {
        const deleted = await prisma.post.deleteMany({
            where: {
                sourceName: { contains: 'jornadatop' }
            }
        });
        console.log(`✅ ${deleted.count} posts removidos.`);
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
