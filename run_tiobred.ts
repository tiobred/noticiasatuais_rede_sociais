import { runPipeline } from './lib/agents/orchestrator';

async function main() {
    try {
        console.log('Iniciando pipeline para Tiobred...');
        const result = await runPipeline('Tiobred');
        console.log('Resultado do Pipeline:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Erro no pipeline:', error);
    } finally {
        process.exit(0);
    }
}

main();
