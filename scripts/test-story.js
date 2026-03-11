const axios = require('axios');
require('dotenv').config();

async function main() {
    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    const allAccounts = JSON.parse(allAccountsStr);
    const acc = allAccounts.find((a) => a.id.toLowerCase() === 'tiobred');
    if (!acc) throw Error('Account tiobred not found');

    console.log(`Testing account: ${acc.id} (UID: ${acc.userId})`);

    const api = axios.create({ baseURL: 'https://graph.facebook.com/v21.0' });
    const testImageUrl = 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1000&auto=format&fit=crop';

    console.log('[test] Iniciando container...');
    try {
        const { data: container } = await api.post(`/${acc.userId}/media`, null, {
            params: { image_url: testImageUrl, media_type: 'STORIES', access_token: acc.accessToken }
        });
        console.log('[test] Container ID:', container.id);

        console.log('[test] Aguardando 10s para processamento...');
        await new Promise(r => setTimeout(r, 10000));

        console.log('[test] Publicando...');
        const { data: pub } = await api.post(`/${acc.userId}/media_publish`, null, {
            params: { creation_id: container.id, access_token: acc.accessToken }
        });
        console.log('[test] ✅ SUCESSO! ID da publicação:', pub.id);
    } catch (e) {
        console.error('[test] ❌ ERRO:', e.response?.data || e.message);
    }
}

main();
