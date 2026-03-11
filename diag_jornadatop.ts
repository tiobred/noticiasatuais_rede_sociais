
import { InstagramPublisher } from './lib/social/instagram';
import dotenv from 'dotenv';
dotenv.config();

async function testJornadaTop() {
    const instagramAccountsStr = process.env.INSTAGRAM_ACCOUNTS;
    if (!instagramAccountsStr) {
        console.error('INSTAGRAM_ACCOUNTS not found');
        return;
    }

    const accounts = JSON.parse(instagramAccountsStr);
    const tiobred = accounts.find((a: any) => a.id === 'Tiobred');

    if (!tiobred) {
        console.error('Tiobred account not found in INSTAGRAM_ACCOUNTS');
        return;
    }

    const publisher = new InstagramPublisher(tiobred.accessToken, tiobred.userId);
    const username = 'jornadatop';

    try {
        console.log(`Buscando posts de @${username}...`);
        const posts = await publisher.getBusinessDiscovery(username, 5);
        console.log(`Encontrados ${posts.length} posts.`);

        posts.forEach((post: any, i: number) => {
            console.log(`\nPost ${i + 1}:`);
            console.log(`ID: ${post.id}`);
            console.log(`Likes: ${post.like_count}`);
            console.log(`Comments: ${post.comments_count}`);
            console.log(`Caption: ${post.caption?.substring(0, 50)}...`);
            console.log(`Action: ${post.like_count >= 5000 && post.comments_count >= 100 ? 'ELEGÍVEL' : 'IGNORADO'}`);
        });
    } catch (err) {
        console.error('Erro:', err);
    }
}

testJornadaTop().catch(console.error);
