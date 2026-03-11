import { runPipeline } from '../lib/agents/orchestrator';

async function main() {
    try {
        console.log('Iniciando pipeline para promo (via script standalone)...');
        const result = await runPipeline('promo');
        console.log('Resultado do Pipeline para promo:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Erro no pipeline promo:', error);
    } finally {
        process.exit(0);
    }
}

main();
