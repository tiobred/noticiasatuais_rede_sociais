const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const keys = ['CHANNEL_INSTAGRAM_FEED', 'CHANNEL_INSTAGRAM_STORY', 'CHANNEL_INSTAGRAM_REELS'];
    for (const accountId of ['global', 'tiobred', 'Tiobred']) {
        console.log(`--- ${accountId} ---`);
        const configs = await prisma.systemConfig.findMany({
            where: { accountId, key: { in: keys } }
        });
        configs.forEach(c => console.log(`${c.key}: ${c.value}`));
    }
}

main().finally(() => prisma.$disconnect());
