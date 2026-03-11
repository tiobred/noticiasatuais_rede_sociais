const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const configs = await prisma.systemConfig.findMany({
        select: { accountId: true },
        distinct: ['accountId']
    });
    console.log('AccountIDs na DB:', configs.map(c => `'${c.accountId}'`));

    require('dotenv').config();
    const accounts = JSON.parse(process.env.INSTAGRAM_ACCOUNTS || '[]');
    console.log('AccountIDs no ENV:', accounts.map(a => `'${a.id}'`));
}

main().finally(() => prisma.$disconnect());
