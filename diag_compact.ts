
import { InstagramPublisher } from './lib/social/instagram';
import dotenv from 'dotenv';
dotenv.config();

async function testJornadaTop() {
    const instagramAccountsStr = process.env.INSTAGRAM_ACCOUNTS;
    if (!instagramAccountsStr) return console.error('INSTAGRAM_ACCOUNTS not found');

    const accounts = JSON.parse(instagramAccountsStr);
    const tiobred = accounts.find((a: any) => a.id === 'Tiobred');
    if (!tiobred) return console.error('Tiobred account not found');

    const publisher = new InstagramPublisher(tiobred.accessToken, tiobred.userId);
    const username = 'jornadatop';

    try {
        console.log(`Checking @${username}...`);
        const posts = await publisher.getBusinessDiscovery(username, 5);
        for (const post of posts) {
            const l = post.like_count || 0;
            const c = post.comments_count || 0;
            const ok = l >= 5000 && c >= 100;
            console.log(`Post ${post.id}: L=${l}, C=${c} -> ${ok ? 'ELEGIBLE' : 'IGNORED'}`);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}
testJornadaTop();
