const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pubs = await prisma.socialPublication.findMany({
        where: { channel: 'INSTAGRAM_STORY' },
        take: 5,
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Encontradas ${pubs.length} publicações de STORY.`);
    for (const pub of pubs) {
        console.log(`[${pub.createdAt.toISOString()}] ID: ${pub.id}, Account: ${pub.accountId}, Status: ${pub.status}, ExtID: ${pub.externalId}`);
    }
}

main().finally(() => prisma.$disconnect());
