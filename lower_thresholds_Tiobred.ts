import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('📉 Baixando thresholds para Tiobred...');
    const config = await prisma.systemConfig.findUnique({
        where: {
            key_accountId: {
                key: 'IG_MONITOR_TARGETS',
                accountId: 'Tiobred'
            }
        }
    });

    if (config) {
        const targets = JSON.parse(config.value as string);
        const updatedTargets = targets.map((t: any) => {
            if (t.username === 'jornadatop') {
                return { ...t, minLikes: 10, minComments: 0 };
            }
            return t;
        });

        await prisma.systemConfig.update({
            where: {
                key_accountId: {
                    accountId: 'Tiobred',
                    key: 'IG_MONITOR_TARGETS'
                }
            },
            data: {
                value: JSON.stringify(updatedTargets)
            }
        });
        console.log('✅ Thresholds atualizados para jornadatop: likes > 10, comments > 0');
    } else {
        console.log('❌ Config IG_MONITOR_TARGETS não encontrada para Tiobred');
    }
}

main().finally(() => prisma.$disconnect());
