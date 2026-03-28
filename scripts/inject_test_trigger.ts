import prisma from '../lib/db';

async function main() {
    // 1. Calcular hora atual e adicionar 2 minutos
    const now = new Date();
    const brTime = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hour12: false
    }).format(now).replace(/[^0-9:]/g, ''); 
    const [brH, brM] = brTime.split(':').map(Number);

    let nextM = brM + 3; // +3 min de margem
    let nextH = brH;
    if (nextM >= 60) {
        nextM -= 60;
        nextH = (nextH + 1) % 24;
    }

    const targetTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
    const cronExpression = `${nextM} ${nextH} * * *`; // Executa exatamente nesse minuto
    console.log(`Injecting trigger for targetTime: ${targetTime} / cron: '${cronExpression}'`);

    // 2. Fetch current config
    const config = await prisma.systemConfig.findUnique({
        where: { key_accountId: { key: 'SCHEDULER_TRIGGERS', accountId: 'global' } }
    });

    let triggers: any[] = [];
    try { 
        triggers = typeof config?.value === 'string' ? JSON.parse(config.value) : (config?.value as any || []); 
    } catch (e) {}


    // Limpar triggers de teste anteriores para não poluir
    triggers = triggers.filter(t => t.id !== 'test-trigger-faster');

    // Adicionar trigger de teste
    triggers.push({
        id: 'test-trigger-faster',
        type: 'days', // ou 'cron' se quiser testar o de-atraso
        value: targetTime
    });

    // 3. Update DB
    await prisma.systemConfig.upsert({
        where: { key_accountId: { key: 'SCHEDULER_TRIGGERS', accountId: 'global' } },
        create: { key: 'SCHEDULER_TRIGGERS', accountId: 'global', value: JSON.stringify(triggers) },
        update: { value: JSON.stringify(triggers) }
    });

    console.log(`✅ Trigger de teste injetado para rodar às ${targetTime}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
