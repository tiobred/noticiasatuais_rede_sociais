import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSchedulerKeys() {
    console.log("Iniciando correção de chaves schedulerEnabled vs isActive...");

    // 1. Pega todas as chaves schedulerEnabled
    const schedulerConfigs = await prisma.systemConfig.findMany({
        where: { key: 'schedulerEnabled' }
    });

    console.log(`Encontradas ${schedulerConfigs.length} configurações 'schedulerEnabled'. Mapeando para 'isActive'...`);

    for (const config of schedulerConfigs) {
        // Usa o valor para atualizar a chave isActive
        await prisma.systemConfig.upsert({
            where: {
                key_accountId: {
                    key: 'isActive',
                    accountId: config.accountId
                }
            },
            update: {
                value: config.value
            },
            create: {
                key: 'isActive',
                accountId: config.accountId,
                value: config.value
            }
        });
        
        console.log(`  Conta [${config.accountId}]: ajustado isActive = ${JSON.stringify(config.value)}.`);
        
        // Remove old 'schedulerEnabled'
        await prisma.systemConfig.delete({
            where: {
                key_accountId: {
                    key: 'schedulerEnabled',
                    accountId: config.accountId
                }
            }
        });
    }

    console.log("Correção finalizada com sucesso!");
}

fixSchedulerKeys()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
