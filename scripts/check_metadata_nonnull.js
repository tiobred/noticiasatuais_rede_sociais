const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.post.findMany({
        where: { 
            accountId: 'promo',
            metadata: { not: null }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    
    console.log(`--- Posts with METADATA for account: promo ---`);
    posts.forEach(p => {
        console.log(`ID: ${p.id}, Title: ${p.title}`);
        console.log(`Metadata: ${JSON.stringify(p.metadata)}`);
        console.log('---');
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
