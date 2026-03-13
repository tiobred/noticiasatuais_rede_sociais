const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accountId = 'global';
    const configs = await prisma.systemConfig.findMany({
        where: { accountId: accountId },
        select: { key: true }
    });
    
    console.log(`--- KEYS for account: ${accountId} ---`);
    console.log(configs.map(c => c.key).sort());
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
