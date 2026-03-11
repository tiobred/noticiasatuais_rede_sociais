import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Configs for Tiobred ---');
    const tiobredConfigs = await prisma.systemConfig.findMany({
        where: { accountId: 'Tiobred' }
    });
    tiobredConfigs.forEach(c => console.log(`${c.key}: ${JSON.stringify(c.value)}`));

    console.log('\n--- Global Configs ---');
    const globalConfigs = await prisma.systemConfig.findMany({
        where: { accountId: 'global' }
    });
    globalConfigs.forEach(c => console.log(`${c.key}: ${JSON.stringify(c.value)}`));
}

main().finally(() => prisma.$disconnect());
