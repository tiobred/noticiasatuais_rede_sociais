import 'dotenv/config';
import { InstagramScraperAgent } from '../lib/agents/instagram-scraper-agent';

async function crawl() {
    console.log('Crawling @jornadatop via InstagramScraperAgent...');

    const accountId = 'promo';
    const targets = [
        { username: 'jornadatop', minLikes: 0, minComments: 0, postOriginal: true }
    ];

    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    const allAccounts = JSON.parse(allAccountsStr);

    const scraper = new InstagramScraperAgent();
    // run returns PROCESSED items ready for injection or testing
    const items = await scraper.run(accountId, targets, allAccounts);

    console.log('Scraped Items Count:', items.length);
    if (items.length > 0) {
        // Encontra o primeiro vídeo
        const videoItem = items.find(i => i.imageUrl.includes('.mp4') || i.imageUrl.includes('video'));
        if (videoItem) {
            console.log('VÍDEO ENCONTRADO!');
            console.log('Original URL:', videoItem.originalUrl);
            console.log('Video Link (ImageUrl):', videoItem.imageUrl);
        } else {
            console.log('Nenhum vídeo encontrado nos primeiros 10 posts.');
            console.log('Primeiro item:', items[0].imageUrl);
        }
    }
}

crawl().catch(console.error);
