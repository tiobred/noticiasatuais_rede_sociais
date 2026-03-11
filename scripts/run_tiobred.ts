import { runPipeline } from '../lib/agents/orchestrator';

async function main() {
    console.log('🚀 Iniciando pipeline manual para Tiobred...');
    try {
        const result = await runPipeline('Tiobred');
        console.log('✅ Pipeline finalizado:', result);
    } catch (err) {
        console.error('❌ Erro no pipeline:', err);
    }
}

main();
