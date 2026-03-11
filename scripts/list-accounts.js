const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ids = await prisma.systemConfig.findMany({
        select: { accountId: true },
        distinct: ['accountId']
    });
    console.log('AccountIDs existentes na SystemConfig:', ids.map(i => i.accountId));

    const allConfigs = await prisma.systemConfig.findMany();
    console.log(`Total de registros: ${allConfigs.length}`);
    for (const c of allConfigs) {
        console.log(`- Account: ${c.accountId}, Key: ${c.key}, Value: ${JSON.stringify(c.value).slice(0, 50)}`);
    }
}

main().finally(() => prisma.$disconnect());
