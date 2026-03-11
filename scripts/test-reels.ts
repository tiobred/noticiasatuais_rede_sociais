#!/usr/bin/env ts-node
import 'dotenv/config';
import { InstagramPublisher } from '../lib/social/instagram';
import { rehostVideo, deleteHostedFile } from '../lib/social/image-composer';

async function main() {
    console.log('--- Iniciando teste de Reels (Upload Temporário) ---');

    // Configurações e Contas
    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    const allAccounts = JSON.parse(allAccountsStr);
    const targetAccount = allAccounts.find((acc: any) => acc.id === 'promo');

    if (!targetAccount) {
        console.error('ERRO: Conta "promo" não encontrada no ENV.');
        return;
    }

    const igPublisher = new InstagramPublisher(targetAccount.accessToken, targetAccount.userId);

    // Vídeo de teste pequeno (Rabbit - 1.5MB)
    const testVideoUrl = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";

    try {
        console.log(`1. Re-hospedando vídeo no Supabase...`);
        const rehostResult = await rehostVideo(testVideoUrl, 'reels-test');

        if (!rehostResult.filename) {
            console.error('❌ Falha ao hospedar vídeo no Supabase.');
            return;
        }

        console.log(`✅ Vídeo hospedado temporariamente: ${rehostResult.publicUrl}`);

        try {
            console.log('2. Enviando para o Instagram (Publicação Real)...');
            const result = await igPublisher.publishVideo(
                rehostResult.publicUrl,
                "Teste de Reels com novo sistema de upload temporário ✅🚀 #test #reels #automation",
                'jornadatop'
            );
            console.log('✅ REELS PUBLICADO:', result);
        } catch (error: any) {
            console.error('❌ Falha ao publicar no Instagram:', error.message);
        } finally {
            console.log('3. Limpando arquivo do storage Supabase...');
            await deleteHostedFile(rehostResult.filename);
            console.log('✅ Arquivo removido do Supabase.');
        }
    } catch (err: any) {
        console.error('❌ ERRO NO FLUXO:', err.message);
    }
}

main().catch(console.error);
