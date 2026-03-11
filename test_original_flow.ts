import 'dotenv/config';
import { runPipeline } from './lib/agents/orchestrator';
import prisma from './lib/db';

async function testOriginalFlow() {
    console.log('--- Testando Fluxo de Postagem Original ---');

    const accountId = 'Tiobred'; // Usando tiobred como exemplo

    // Limpar posts de teste anteriores para garantir que o scraper pegue como novos
    await prisma.post.deleteMany({
        where: {
            tags: { has: `account:${accountId}` }
        }
    });

    // Como o runPipeline instancia o scraper internamente, vamos apenas rodar 
    // e observar o log se ele detecta o @jornadatop (que deve estar com a flag no banco agora se configuramos na UI)

    console.log('Iniciando pipeline...');
    await runPipeline(accountId);

    console.log('--- Fim do Teste ---');
}

testOriginalFlow().catch(console.error);
