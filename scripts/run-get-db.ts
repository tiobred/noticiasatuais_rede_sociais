import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.agentRun.findMany({ take: 5, orderBy: { id: 'desc' } });
    console.log(JSON.stringify(logs, null, 2));

    const config = await prisma.systemConfig.findMany({ 
        where: { accountId: 'promo' }
    });
    console.log("PROMO CONFIG:", JSON.stringify(config, null, 2));
    const configG = await prisma.systemConfig.findMany({ 
        where: { accountId: 'global' }
    });
    console.log("GLOBAL CONFIG:", JSON.stringify(configG, null, 2));
    const configT = await prisma.systemConfig.findMany({ 
        where: { accountId: 'tiobred' }
    });
    console.log("TIOBRED CONFIG:", JSON.stringify(configT, null, 2));
}

main().catch(console.error);
