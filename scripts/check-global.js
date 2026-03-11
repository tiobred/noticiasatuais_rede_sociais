const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const globalConfigs = await prisma.systemConfig.findMany({
        where: { accountId: 'global' }
    });
    console.log('--- GLOBAL CONFIGS ---');
    globalConfigs.forEach(c => console.log(`${c.key}: ${JSON.stringify(c.value)}`));
}

main().finally(() => prisma.$disconnect());
