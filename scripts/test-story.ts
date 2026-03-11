require('dotenv').config();
import { InstagramPublisher } from '../lib/social/instagram';

async function main() {
    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    const allAccounts = JSON.parse(allAccountsStr);
    const acc = allAccounts.find((a: any) => a.id.toLowerCase() === 'tiobred');
    if (!acc) throw new Error('Account tiobred not found in env');

    console.log(`Testing account: ${acc.id} (UID: ${acc.userId})`);
    const publisher = new InstagramPublisher(acc.accessToken, acc.userId);

    const testImageUrl = 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1000&auto=format&fit=crop';

    console.log('--- TEST PUBLISH STORY ---');
    try {
        const result = await publisher.publishStory(testImageUrl);
        console.log('✅ Story publicado com sucesso!', result);
    } catch (e: any) {
        console.error('❌ Erro na publicação:', e.response?.data || e.message);
    }
}

main().catch(console.error);
