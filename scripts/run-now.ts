#!/usr/bin/env ts-node
import 'dotenv/config';
import { runPipeline } from '../lib/agents/orchestrator';

async function main() {
    console.log('🚀 Iniciando pipeline completo manualmente...');
    const result = await runPipeline();
    console.log(`\n✅ Pipeline concluído!`);
    console.log(`   Scrapeados: ${result.postsFound}`);
    console.log(`   Novos Posts (Processados e Salvos): ${result.postsNew}`);
    console.log(`   Carrosseis Publicados: ${result.postsPublished}`);
}

main().catch(err => {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
});
