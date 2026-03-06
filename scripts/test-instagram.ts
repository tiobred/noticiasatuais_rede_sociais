#!/usr/bin/env ts-node
/**
 * Testa publicação no Instagram (feed e story)
 * Uso: npx ts-node --project tsconfig.scripts.json scripts/test-instagram.ts
 */

import 'dotenv/config';
import { InstagramPublisher } from '../lib/social/instagram';

async function main() {
    console.log('\n📸 Testando Instagram Graph API...\n');

    const ig = new InstagramPublisher();

    const testImage = 'https://via.placeholder.com/1080x1080/0a0f1e/10b981?text=Noticia+da+Hora+%F0%9F%93%8A';
    const caption = [
        '🧪 *Teste de integração — Notícia da Hora*',
        '',
        '📊 Sistema de monitoramento econômico ativo.',
        'Notícias do Brasil em tempo real, analisadas com IA.',
        '',
        '#teste #economia #brasil #fintech #noticiaDaHora',
    ].join('\n');

    console.log('📤 Publicando no feed...');
    const feedResult = await ig.publishFeed(testImage, caption);
    console.log(`✅ Feed publicado! ID: ${feedResult.postId}`);

    console.log('\n📤 Publicando no story...');
    const storyResult = await ig.publishStory(testImage);
    console.log(`✅ Story publicado! ID: ${storyResult.postId}`);

    console.log('\n🎉 Instagram testado com sucesso!\n');
}

main().catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
