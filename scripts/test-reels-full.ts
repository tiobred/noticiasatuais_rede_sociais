import 'dotenv/config';
import { InstagramScraperAgent } from '../lib/agents/instagram-scraper-agent';
import { InstagramPublisher } from '../lib/social/instagram';
import { rehostVideo, deleteHostedFile } from '../lib/social/image-composer';

async function fullTest() {
    console.log('--- TESTE COMPLETO DE REELS COM LINK REAL ---');

    // 1. Scraping
    const accountId = 'promo';
    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    const allAccounts = JSON.parse(allAccountsStr);
    const targets = [{ username: 'jornadatop', minLikes: 0, minComments: 0, postOriginal: true }];

    const scraper = new InstagramScraperAgent();
    console.log('📡 Buscando links reais via Discovery API...');
    const items = await scraper.run(accountId, targets, allAccounts);

    const videoItem = items.find(i => i.imageUrl.includes('.mp4') || i.imageUrl.includes('video') || i.imageUrl.includes('fbcdn.net'));

    if (!videoItem) {
        console.error('❌ Nenhum vídeo encontrado em @jornadatop para teste.');
        return;
    }

    const realVideoUrl = videoItem.imageUrl;
    console.log(`✅ Link capturado: ${realVideoUrl.slice(0, 100)}...`);

    // 2. Re-hospedagem e Publicação
    const targetAccount = allAccounts.find((acc: any) => acc.id === accountId);
    const igPublisher = new InstagramPublisher(targetAccount.accessToken, targetAccount.userId);

    console.log('3. Re-hospedando vídeo REAL no Supabase...');
    const rehostResult = await rehostVideo(realVideoUrl, 'reels-real-test');

    if (!rehostResult.filename) {
        console.error('❌ Falha ao hospedar vídeo REAL no Supabase.');
        return;
    }

    console.log(`✅ Vídeo em storage pública: ${rehostResult.publicUrl}`);

    try {
        console.log('4. Enviando Reels para Instagram (@promocoes__da__quebrada ou similar)...');
        // Usando legenda simples para teste
        const caption = `Teste de Reels Automatizado ⚡ Capturado de @jornadatop\n\n#test #automation #reels`;
        const result = await igPublisher.publishVideo(
            rehostResult.publicUrl,
            caption,
            'jornadatop'
        );
        console.log('🚀 REELS PUBLICADO COM SUCESSO! Link / ID:', result);
    } catch (error: any) {
        console.error('❌ Falha na publicação final:', error.message);
    } finally {
        console.log('5. Limpando Supabase...');
        await deleteHostedFile(rehostResult.filename);
        console.log('✅ Finalizado.');
    }
}

fullTest().catch(console.error);
