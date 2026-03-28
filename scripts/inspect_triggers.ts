import prisma from '../lib/db';
import { getMergedConfigs } from '../lib/db/config-helper';

async function main() {
    const configs = await prisma.systemConfig.findMany({
        where: { key: 'SCHEDULER_TRIGGERS' }
    });
    console.log('\n=== SCHEDULER_TRIGGERS RAW ===');
    console.log(JSON.stringify(configs, null, 2));

    const relevantKeys = [
        'isActive', 'schedulerEnabled', 'CHANNEL_INSTAGRAM_FEED', 
        'CHANNEL_INSTAGRAM_STORY', 'CHANNEL_INSTAGRAM_REELS', 
        'CHANNEL_YOUTUBE_SHORTS', 'CHANNEL_WHATSAPP', 
        'SCHEDULER_TRIGGERS', 'POSTING_TIMES'
    ];

    console.log('\n=== MERGED CONFIG FOR ACCOUNT [global] ===');
    const globalMerged = await getMergedConfigs('global', relevantKeys);
    console.log(JSON.stringify(globalMerged, null, 2));
    
    console.log('\n=== MERGED CONFIG FOR ACCOUNT [tiobred] ===');
    const merged = await getMergedConfigs('tiobred', relevantKeys);
    console.log(JSON.stringify(merged, null, 2));
    console.log('===========================================\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
