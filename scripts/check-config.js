const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Buscando Configurações de Contas ---');
    const globalConfig = await prisma.systemConfig.findFirst({
        where: { key: 'INSTAGRAM_ACCOUNTS' }
    });

    if (globalConfig) {
        console.log('INSTAGRAM_ACCOUNTS encontrada na SystemConfig (Global)');
        const accounts = typeof globalConfig.value === 'string' ? JSON.parse(globalConfig.value) : globalConfig.value;
        accounts.forEach(a => {
            console.log(`- ID: ${a.id}, Username: ${a.username}, UserID (IG): ${a.userId}`);
        });
    } else {
        console.log('Nenhuma configuração GLOBAL de INSTAGRAM_ACCOUNTS encontrada.');
        console.log('Usando IDs do ENV:', process.env.INSTAGRAM_ACCOUNTS ? 'Sim' : 'Não');
    }

    const accountSpecific = await prisma.systemConfig.findMany({
        where: { accountId: 'tiobred' }
    });

    console.log('\n--- Configurações Específicas para [tiobred] ---');
    accountSpecific.forEach(s => {
        console.log(`- ${s.key}: ${JSON.stringify(s.value)}`);
    });

    if (accountSpecific.length === 0) {
        console.log('Nenhuma configuração específica encontrada para [tiobred].');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
