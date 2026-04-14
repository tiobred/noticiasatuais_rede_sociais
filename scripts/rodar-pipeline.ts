import 'dotenv/config';
import { runPipeline } from '../lib/agents/orchestrator';

/**
 * Roda o pipeline manualmente para a conta promo para testar
 */
async function main() {
    const accountId = process.argv[2] || 'promo';
    console.log(`\n=== Rodando pipeline manualmente para: ${accountId} ===\n`);
    
    try {
        const result = await runPipeline(accountId);
        console.log('\n=== Resultado:', JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error('\n=== ERRO:', e.message);
    }
}

main().catch(console.error);
