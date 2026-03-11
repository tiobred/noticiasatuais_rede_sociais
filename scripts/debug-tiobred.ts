import prisma from '../lib/db';
import * as fs from 'fs';

async function main() {
    const accountId = 'Tiobred';
    const posts = await prisma.post.findMany({
        where: { accountId, status: 'PROCESSED' },
        include: { publications: true }
    });

    let output = `Posts PROCESSED for ${accountId}:\n`;
    posts.forEach(p => {
        const metadata = p.metadata as any;
        output += `- [${p.id}] ${p.title}\n`;
        output += `  postOriginal: ${metadata?.postOriginal}\n`;
        output += `  imageUrl: ${p.imageUrl}\n`;
        output += `  Publications: ${p.publications.length}\n`;
    });

    const lastPubs = await prisma.socialPublication.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    output += `\nLast Publications for ${accountId}:\n`;
    lastPubs.forEach(pub => {
        output += `- ${pub.createdAt}: ${pub.channel} -> ${pub.status} (${pub.error || 'no error'})\n`;
    });

    fs.writeFileSync('tiobred_debug.txt', output);
}

main().catch(console.error).finally(() => prisma.$disconnect());
