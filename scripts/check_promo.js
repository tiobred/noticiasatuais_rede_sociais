const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accountId = 'promo';
    const configs = await prisma.systemConfig.findMany({
        where: { accountId: accountId }
    });
    
    console.log(`--- FULL Configs for account: ${accountId} ---`);
    console.log(JSON.stringify(configs, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
