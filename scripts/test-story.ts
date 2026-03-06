/**
 * Teste isolado de publicação no Instagram Story
 * Uso: npm run test:story
 *
 * O story usa a mesma imagem composta do carrossel (com título + texto em overlay),
 * garantindo que o visual seja consistente.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { InstagramPublisher } from '../lib/social/instagram';
import { composeStoryImage } from '../lib/social/image-composer';

// Dados de teste para compor o slide do Story
const TEST_TITLE = 'Ibovespa sobe 2% após dados do PIB superarem expectativas';
const TEST_SUMMARY = 'O PIB brasileiro cresceu 3,2% no 4T24, acima dos 2,8% esperados pelo mercado. '
    + 'O resultado impulsionou o Ibovespa e fortaleceu o real frente ao dólar.'

const TEST_IMAGE_URL = process.env.STORY_TEST_IMAGE
    ?? 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1080&auto=format&fit=crop';

async function main() {
    console.log('\n📸 [test-story] Compondo imagem com texto para o Story...\n');
    console.log(`   Título: ${TEST_TITLE}`);
    console.log(`   Imagem base: ${TEST_IMAGE_URL}\n`);

    // 1. Compor a imagem 9:16 com overlay de título e texto
    const composed = await composeStoryImage(TEST_IMAGE_URL, TEST_TITLE, TEST_SUMMARY);
    console.log(`\n✅ Imagem composta: ${composed.publicUrl}\n`);

    // 2. Publicar no Story
    console.log('📤 Publicando Story no Instagram...');
    const ig = new InstagramPublisher();

    try {
        const result = await ig.publishStory(composed.publicUrl);
        console.log(`\n✅ Story publicado com sucesso!`);
        console.log(`   Post ID: ${result.postId}`);
        console.log('\n🔗 Verifique em: https://www.instagram.com/tiobred/\n');
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`\n❌ Erro ao publicar Story: ${msg}\n`);
        if (err instanceof Error && 'response' in err) {
            const e = err as any;
            console.error('Detalhes da API:', JSON.stringify(e?.response?.data ?? e?.response, null, 2));
        }
        process.exit(1);
    }
}

main();
