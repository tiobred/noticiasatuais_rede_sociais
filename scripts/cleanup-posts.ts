import prisma from '../lib/db';

async function cleanupOldPosts() {
    console.log('🧹 Iniciando limpeza de posts e relatórios com mais de 24 horas...');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        // Apaga publicações sociais antigas (onDelete: Cascade no schema ajuda, mas garantimos)
        const deletedSocial = await prisma.socialPublication.deleteMany({
            where: {
                createdAt: { lt: oneDayAgo }
            }
        });

        // Apaga posts antigos
        const deletedPosts = await prisma.post.deleteMany({
            where: {
                createdAt: { lt: oneDayAgo }
            }
        });

        // Apaga AgentRuns antigos
        const deletedRuns = await prisma.agentRun.deleteMany({
            where: {
                startedAt: { lt: oneDayAgo }
            }
        });

        console.log(`✅ Limpeza concluída:`);
        console.log(`- ${deletedPosts.count} posts excluídos.`);
        console.log(`- ${deletedSocial.count} publicações sociais excluídas.`);
        console.log(`- ${deletedRuns.count} execuções de agentes excluídas.`);
    } catch (err) {
        console.error('❌ Erro na limpeza de posts antigos:', err);
    }
}

cleanupOldPosts()
    .catch(err => {
        console.error('Erro geral:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
