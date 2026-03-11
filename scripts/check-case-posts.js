const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ids = await prisma.post.findMany({
        select: { accountId: true },
        distinct: ['accountId']
    });
    console.log('AccountIDs na tabela Post:', ids.map(i => `'${i.accountId}'`));

    require('dotenv').config();
    const accounts = JSON.parse(process.env.INSTAGRAM_ACCOUNTS || '[]');
    console.log('AccountIDs no ENV:', accounts.map(a => `'${a.id}'`));
}

main().finally(() => prisma.$disconnect());
