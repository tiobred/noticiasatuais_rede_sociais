
import prisma from './lib/db';

async function listAllConfigs() {
    const configs = await prisma.systemConfig.findMany();
    console.log('Todas as Configurações:', JSON.stringify(configs, null, 2));
}

listAllConfigs().catch(console.error);
