const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock getMergedConfigs logic since I can't easily call the API route directly from shell
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
    'isActive', 'SCRAPER_LIMIT_PER_SOURCE', 'DATA_SOURCES', 'THEMES',
    'IG_MONITOR_TARGETS', 'CHANNEL_INSTAGRAM_FEED', 'CHANNEL_INSTAGRAM_STORY',
    'CHANNEL_INSTAGRAM_REELS', 'CHANNEL_WHATSAPP', 'CHANNEL_YOUTUBE_SHORTS',
    'postingTimes', 'POSTING_TIMES', 'imageStyle', 'primaryColor',
    'feed_layout', 'FEED_LAYOUT', 'story_layout', 'STORY_LAYOUT',
    'reels_layout', 'REELS_LAYOUT', 'schedulerEnabled'
];

const defaults = {
    isActive: true,
    CHANNEL_INSTAGRAM_FEED: false,
    CHANNEL_INSTAGRAM_STORY: false,
    CHANNEL_INSTAGRAM_REELS: false,
    CHANNEL_WHATSAPP: false,
    CHANNEL_YOUTUBE_SHORTS: false,
    schedulerEnabled: true,
    SCRAPER_LIMIT_PER_SOURCE: 4,
    imageStyle: 'modern',
    primaryColor: '#1a1a1a'
};

async function main() {
    const accountId = 'promo';
    const mergedConfigs = await getMergedConfigs(accountId, relevantKeys);
    
    // Fixed logic from route.ts
    const normalized = { ...defaults };
    for (const [key, value] of Object.entries(mergedConfigs)) {
        if (value !== undefined) {
            normalized[key] = value;
        }
    }
    
    console.log(`--- Mock API GET Result for ${accountId} (FIXED) ---`);
    console.log(`CHANNEL_YOUTUBE_SHORTS: ${normalized.CHANNEL_YOUTUBE_SHORTS}`);
}

main().finally(() => prisma.$disconnect());
