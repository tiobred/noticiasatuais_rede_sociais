import prisma from '../lib/db';

async function main() {
    const config = await prisma.systemConfig.findUnique({
        where: { key_accountId: { key: 'SCHEDULER_TRIGGERS', accountId: 'global' } }
    });

    if (!config) return;

    let triggers: any[] = [];
    try { 
        triggers = typeof config.value === 'string' ? JSON.parse(config.value) : (config.value as any || []); 
    } catch (e) {}


    const cleanTriggers = triggers.filter(t => t.id !== 'test-trigger-faster');

    await prisma.systemConfig.update({
        where: { key_accountId: { key: 'SCHEDULER_TRIGGERS', accountId: 'global' } },
        data: { value: JSON.stringify(cleanTriggers) }
    });

    console.log('✅ Trigger de teste limpo com sucesso.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
