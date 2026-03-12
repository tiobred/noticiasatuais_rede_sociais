import 'dotenv/config';
import { InstagramPublisher } from '../lib/social/instagram';
import { composeStoryImage } from '../lib/social/image-composer';

async function main() {
    console.log('--- Iniciando teste de Story (Composição Real) ---');

    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    const allAccounts = JSON.parse(allAccountsStr);
    const targetAccount = allAccounts.find((acc: any) => acc.id === 'promo');

    if (!targetAccount) {
        console.error('ERRO: Conta "promo" não encontrada no ENV.');
        return;
    }

    const igPublisher = new InstagramPublisher(targetAccount.accessToken, targetAccount.userId);

    try {
        console.log('1. Compondo imagem de Story...');
        const composed = await composeStoryImage(
            "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1080&auto=format&fit=crop",
            "Teste de Story " + new Date().toLocaleTimeString(),
            "Este é um teste automático para verificar por que os stories não estão aparecendo. #test #story #automation",
            { fontColor: '#ffffff' }
        );

        console.log(`✅ Imagem composta: ${composed.publicUrl}`);

        console.log('2. Enviando para o Instagram...');
        const result = await igPublisher.publishStory(composed.publicUrl);
        console.log('✅ STORY PUBLICADO:', result);
    } catch (err: any) {
        console.error('❌ ERRO NO TESTE DE STORY:', err.message);
        if (err.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

main().catch(console.error);
