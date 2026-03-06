#!/usr/bin/env ts-node
/**
 * Script de teste do pipeline completo (modo dry-run ou real)
 * Uso: npx ts-node --project tsconfig.scripts.json scripts/test-pipeline.ts [--dry-run]
 */

import 'dotenv/config';
import { ScraperAgent } from '../lib/agents/scraper-agent';
import { AnalysisAgent } from '../lib/agents/analysis-agent';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
    console.log(`\n🔬 Testando pipeline — modo: ${DRY_RUN ? 'DRY-RUN' : 'REAL'}\n`);

    // 1. Scraper
    console.log('📡 Etapa 1: Scraping de Feeds RSS (InfoMoney, etc)...');
    const scraper = new ScraperAgent();
    await scraper.init();
    const items = await scraper.scrape();
    await scraper.close();

    console.log(`✅ ${items.length} itens encontrados\n`);
    if (items[0]) {
        console.log('📰 Primeiro item:');
        console.log(`   Título:  ${items[0].title.slice(0, 80)}`);
        console.log(`   Corpo:   ${items[0].body.slice(0, 100)}...`);
        console.log(`   Fonte:   ${items[0].sourceName}`);
        console.log(`   Tags:    ${items[0].tags.slice(0, 5).join(', ')}`);
        console.log(`   Imagem:  ${items[0].imageUrl ?? '(nenhuma)'}\n`);
    }

    if (DRY_RUN) {
        console.log('🚫 Modo dry-run: pulando análise IA e publicação\n');
        return;
    }

    // 2. Análise
    if (items[0]) {
        console.log('🤖 Etapa 2: Análise com OpenAI GPT-4...');
        const analysis = new AnalysisAgent();
        const analyzed = await analysis.analyze(items[0].title, items[0].body, items[0].tags);

        console.log('\n✅ Análise concluída:');
        console.log(`   Título PT-BR: ${analyzed.title}`);
        console.log(`   Hashtags: #${analyzed.hashtags.slice(0, 5).join(' #')}`);
        console.log(`   Instagram: ${analyzed.instagram.feed.slice(0, 100)}...`);
        console.log(`   WhatsApp: ${analyzed.whatsapp.slice(0, 100)}...`);
    }

    console.log('\n✅ Pipeline testado com sucesso!\n');
}

main().catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
