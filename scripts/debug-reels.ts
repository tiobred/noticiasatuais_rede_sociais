import prisma from '../lib/db';
import { getMergedConfigs } from '../lib/db/config-helper';
import { InstagramPublisher } from '../lib/social/instagram';
import { rehostImage, rehostVideo, deleteHostedFile } from '../lib/social/image-composer';

async function main() {
    const accountId = 'promo';
    console.log(`--- Checking Config for account: ${accountId} ---`);

    const configKeys = [
        'CHANNEL_INSTAGRAM_FEED',
        'CHANNEL_INSTAGRAM_STORY',
        'CHANNEL_INSTAGRAM_REELS'
    ];
    const configMap = await getMergedConfigs(accountId, configKeys);

    console.log('Config Map:', JSON.stringify(configMap, null, 2));

    const isReelsEnabled = configMap['CHANNEL_INSTAGRAM_REELS'] === true;
    const isFeedEnabled = configMap['CHANNEL_INSTAGRAM_FEED'] === true;
    console.log('Is Reels Enabled:', isReelsEnabled);
    console.log('Is Feed Enabled:', isFeedEnabled);

    console.log('\n--- PROCESSED Posts for "promo" ---');
    const posts = await prisma.post.findMany({
        where: {
            accountId,
            status: 'PROCESSED'
        },
        take: 5
    });

    if (posts.length === 0) {
        console.log('No PROCESSED posts found for "promo".');
        // Tenta buscar o post mais recente mesmo se publicado para teste
        const lastPosts = await prisma.post.findMany({
            where: { accountId },
            orderBy: { createdAt: 'desc' },
            take: 1
        });
        if (lastPosts.length > 0) {
            console.log('Found latest post (even if not PROCESSED) for inspection/test:', lastPosts[0].id);
            posts.push(lastPosts[0]);
        }
    }

    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    const allAccounts = JSON.parse(allAccountsStr);
    const targetAccount = allAccounts.find((acc: any) => acc.id === accountId);

    if (!targetAccount) {
        console.error('Account credentials not found in ENV');
        return;
    }

    const igPublisher = new InstagramPublisher(targetAccount.accessToken, targetAccount.userId);

    for (const post of posts) {
        console.log(`\nPost ID: ${post.id}`);
        console.log(`Title: ${post.title}`);
        const metadata = post.metadata as any;
        console.log(`- postOriginal: ${metadata?.postOriginal}`);
        console.log(`- mediaType: ${metadata?.mediaType}`);

        if (post.imageUrl && (metadata?.mediaType === 'VIDEO' || metadata?.mediaType === 'REELS' || post.imageUrl.includes('.mp4'))) {
            if (isReelsEnabled) {
                console.log(`-> TEST: Attempting to publish REELS with target tagging...`);
                try {
                    const originalUsername = metadata?.originalUsername || 'unknown';
                    // Usando um vídeo de teste menor (1MB) para garantir que cabe no Supabase
                    const testVideoUrl = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
                    console.log(`-> TEST: Attempting to publish REELS with small sample video...`);

                    const rehostResult = await rehostVideo(testVideoUrl);
                    console.log(`Rehosted URL: ${rehostResult.publicUrl}`);

                    try {
                        const reelsResult = await igPublisher.publishVideo(
                            rehostResult.publicUrl,
                            `Teste de Reels com vídeo pequeno e estável ✅ #test #reels @${originalUsername}`,
                            'jornadatop'
                        );
                        console.log(`✅ REELS TEST SUCCESS:`, reelsResult);
                    } catch (error) {
                        console.error(`❌ REELS TEST FAILED:`, error);
                    } finally {
                        if (rehostResult.filename) {
                            await deleteHostedFile(rehostResult.filename);
                        }
                    }
                } catch (err: any) {
                    console.error('❌ REELS TEST FAILED (outer catch):', err.message);
                }
            }
        }
    }

    console.log('\n--- Recent Publications ---');
    const pubs = await prisma.socialPublication.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    pubs.forEach((pub: any) => {
        console.log(`- ${pub.createdAt}: ${pub.channel} -> ${pub.status} (ID: ${pub.externalId})`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
