const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getMergedConfigs(rawAccountId, keys) {
    const accountId = rawAccountId.toLowerCase();
    const configs = await prisma.systemConfig.findMany({
        where: {
            key: { in: keys },
            OR: [
                { accountId: 'global' },
                { accountId }
            ]
        }
    });

    const merged = {};
    for (const key of keys) {
        const globalConfig = configs.find(c => c.key === key && c.accountId === 'global');
        const accountConfig = configs.find(c => c.key === key && c.accountId === accountId);
        merged[key] = accountConfig !== undefined ? accountConfig.value : (globalConfig !== undefined ? globalConfig.value : undefined);
    }
    return merged;
}

const relevantKeys = [
    'CHANNEL_YOUTUBE_SHORTS'
];

async function main() {
    const accountId = 'promo';
    const mergedConfigs = await getMergedConfigs(accountId, relevantKeys);
    console.log('MergedConfigs for CHANNEL_YOUTUBE_SHORTS:', mergedConfigs);
    
    const defaults = { CHANNEL_YOUTUBE_SHORTS: false };
    const normalized = { ...defaults, ...mergedConfigs };
    console.log('Final Normalized Value:', normalized.CHANNEL_YOUTUBE_SHORTS);
}

main().finally(() => prisma.$disconnect());
