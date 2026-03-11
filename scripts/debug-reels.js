const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accountId = 'promo';
    console.log(`--- Checking Config for account: ${accountId} ---`);
    const configs = await prisma.accountConfig.findMany({
        where: { accountId }
    });
    const configMap = {};
    configs.forEach((c) => {
        configMap[c.key] = c.valueType === 'BOOLEAN' ? c.value === 'true' : c.value;
    });
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
        }
    });

    for (const post of posts) {
        console.log(`\nPost ID: ${post.id}`);
        console.log(`Title: ${post.title}`);
        const metadata = post.metadata;
        console.log(`Metadata:`, JSON.stringify(metadata, null, 2));

        const postOriginal = metadata?.postOriginal === true;
        const mediaType = metadata?.mediaType;
        console.log(`- postOriginal: ${postOriginal}`);
        console.log(`- mediaType: ${mediaType}`);

        if (postOriginal && post.imageUrl) {
            if (mediaType === 'VIDEO' || mediaType === 'REELS') {
                if (isReelsEnabled) {
                    console.log(`-> SHOULD trigger Reels publication (Reels is ENABLED)`);
                } else {
                    console.log(`-> Reels is DISABLED, but this is a video/reels.`);
                }
            } else {
                console.log(`-> NOT a video/reels (mediaType: ${mediaType})`);
            }
        } else {
            console.log(`-> NOT an original post with image/video`);
        }
    }

    console.log('\n--- Past Publications (last 10) for "promo" ---');
    const pubs = await prisma.socialPublication.findMany({
        where: { accountId },
        orderBy: { publishedAt: 'desc' },
        take: 10
    });
    pubs.forEach((pub) => {
        console.log(`- ${pub.publishedAt}: Channel: ${pub.channel}, Status: ${pub.status}, PostId: ${pub.postId}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
