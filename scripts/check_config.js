const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accountId = 'promo';
    const configs = await prisma.systemConfig.findMany({
        where: { accountId: accountId }
    });
    
    console.log(`--- Configs for account: ${accountId} ---`);
    configs.forEach(c => {
        console.log(`${c.key}: ${JSON.stringify(c.value)}`);
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
