const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const statusCounts = await prisma.post.groupBy({
        by: ['status'],
        where: { accountId: 'promo' },
        _count: { id: true }
    });
    
    console.log(`--- Post status counts for account: promo ---`);
    console.log(JSON.stringify(statusCounts, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
