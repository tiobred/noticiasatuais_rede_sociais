import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Ajustando configurações para Tiobred...');

    const configs = [
        { key: 'CHANNEL_INSTAGRAM_FEED', value: true },
        { key: 'CHANNEL_INSTAGRAM_STORY', value: true },
        {
            key: 'IG_MONITOR_TARGETS',
            value: [
                {
                    username: 'jornadatop',
                    minLikes: 10,
                    minComments: 0,
                    postOriginal: true
                }
            ]
        }
    ];

    for (const cfg of configs) {
        await prisma.systemConfig.upsert({
            where: {
                key_accountId: {
                    key: cfg.key,
                    accountId: 'Tiobred'
                }
            },
            update: { value: cfg.value },
            create: {
                key: cfg.key,
                value: cfg.value,
                accountId: 'Tiobred'
            }
        });
        console.log(`✅ ${cfg.key} atualizado para Tiobred`);
    }
}

main().finally(() => prisma.$disconnect());
