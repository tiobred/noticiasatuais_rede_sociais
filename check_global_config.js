const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- SystemConfig GLOBAL ---');
    const configs = await prisma.systemConfig.findMany({
        where: { accountId: 'global' }
    });
    console.log(JSON.stringify(configs, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
