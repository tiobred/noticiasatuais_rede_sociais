const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const keys = [
        'isActive',
        'CHANNEL_INSTAGRAM_FEED',
        'CHANNEL_INSTAGRAM_STORY',
        'CHANNEL_INSTAGRAM_REELS',
        'CHANNEL_WHATSAPP'
    ];

    console.log('--- SystemConfig GLOBAL ---');
    const globalConfigs = await prisma.systemConfig.findMany({
        where: { accountId: 'global', key: { in: keys } }
    });
    console.log(JSON.stringify(globalConfigs, null, 2));

    console.log('\n--- SystemConfig PROMO ---');
    const promoConfigs = await prisma.systemConfig.findMany({
        where: { accountId: 'promo', key: { in: keys } }
    });
    console.log(JSON.stringify(promoConfigs, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
