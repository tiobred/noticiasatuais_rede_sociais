const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accountId = 'promo';
    try {
        const configs = await prisma.accountConfig.findMany({ where: { accountId } });
        const configMap = {};
        configs.forEach(c => {
            configMap[c.key] = c.valueType === 'BOOLEAN' ? c.value === 'true' : c.value;
        });
        console.log('REELS_ENABLED:', configMap['CHANNEL_INSTAGRAM_REELS']);
        console.log('FEED_ENABLED:', configMap['CHANNEL_INSTAGRAM_FEED']);

        const posts = await prisma.post.findMany({
            where: { accountId, status: 'PROCESSED' },
            take: 3
        });

        posts.forEach(p => {
            console.log('--- POST ---');
            console.log('ID:', p.id);
            console.log('METADATA:', JSON.stringify(p.metadata));
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
