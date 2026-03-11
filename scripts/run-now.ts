#!/usr/bin/env ts-node
import 'dotenv/config';
import { runPipeline } from '../lib/agents/orchestrator';

async function main() {
    const accountId = process.argv[2] || 'Tiobred';
    console.log(`🚀 Iniciando pipeline para ${accountId} manualmente...`);
    const result = await runPipeline(accountId);
    console.log(`\n✅ Pipeline concluído!`);
    console.log(`   Scrapeados: ${result.postsFound}`);
    console.log(`   Novos Posts (Processados e Salvos): ${result.postsNew}`);
    console.log(`   Carrosseis Publicados: ${result.postsPublished}`);
}

main().catch(err => {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
});
