import prisma from '../lib/db';
import * as fs from 'fs';

async function main() {
    const accountId = 'Tiobred';
    const reels = await prisma.post.findMany({
        where: { accountId, status: 'PUBLISHED' },
        include: { publications: true }
    });

    let output = `Reels PUBLISHED for ${accountId}:\n`;
    reels.forEach(p => {
        output += `- [${p.id}] ${p.title}\n`;
        output += `  Pubs: ${p.publications.map(pb => `${pb.channel}(${pb.status})`).join(', ')}\n`;
    });

    fs.writeFileSync('tiobred_reels_debug.txt', output);
}

main().catch(console.error).finally(() => prisma.$disconnect());
