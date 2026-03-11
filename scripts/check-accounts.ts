import prisma from '../lib/db';
import * as fs from 'fs';

async function main() {
    let output = '';
    const accounts = await prisma.systemConfig.findMany({
        select: { accountId: true },
        distinct: ['accountId']
    });
    output += `Accounts in SystemConfig: ${JSON.stringify(accounts, null, 2)}\n`;

    for (const acc of accounts) {
        if (!acc.accountId) continue;
        output += `\n--- Config for ${acc.accountId} ---\n`;

        const pendingCount = await prisma.post.count({
            where: { accountId: acc.accountId, status: 'PENDING' }
        });
        const processedCount = await prisma.post.count({
            where: { accountId: acc.accountId, status: 'PROCESSED' }
        });
        const publishedCount = await prisma.post.count({
            where: { accountId: acc.accountId, status: 'PUBLISHED' }
        });

        output += `Counts: PENDING=${pendingCount}, PROCESSED=${processedCount}, PUBLISHED=${publishedCount}\n`;

        const configMap = await prisma.systemConfig.findMany({
            where: { accountId: acc.accountId, key: { in: ['CHANNEL_INSTAGRAM_FEED', 'CHANNEL_INSTAGRAM_STORY', 'CHANNEL_INSTAGRAM_REELS'] } }
        });
        output += `Channels Active: ${JSON.stringify(configMap.map(c => `${c.key}=${c.value}`), null, 2)}\n`;
    }

    fs.writeFileSync('check_out_v2.txt', output);
    console.log('Results written to check_out_v2.txt');
}

main().catch(console.error).finally(() => prisma.$disconnect());
