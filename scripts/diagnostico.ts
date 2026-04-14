import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n======================================================');
    console.log('       DIAGNÓSTICO COMPLETO DO PIPELINE');
    console.log('======================================================\n');

    // 1. Verificar contas no .env
    const accountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    let accounts: { id: string, name: string, userId: string, accessToken: string }[] = [];
    try {
        accounts = JSON.parse(accountsStr);
    } catch (e) {
        console.error('❌ ERRO: INSTAGRAM_ACCOUNTS inválido no .env!', e);
    }

    console.log(`📌 Contas no .env (INSTAGRAM_ACCOUNTS): ${accounts.length}`);
    accounts.forEach(a => {
        const tokenOk = a.accessToken && a.accessToken.length > 10 && !a.accessToken.startsWith('EAAZA') ? '⚠️ token suspeito' : '✅';
        console.log(`   → ID="${a.id}" | Nome="${a.name}" | userId="${a.userId}" | Token: ${tokenOk}`);
    });

    // 2. Verificar SystemConfig para cada conta
    console.log('\n------------------------------------------------------');
    console.log('📋 SystemConfig por conta:');
    
    const allConfigs = await prisma.systemConfig.findMany({
        orderBy: [{ accountId: 'asc' }, { key: 'asc' }]
    });

    const configsByAccount: Record<string, typeof allConfigs> = {};
    for (const c of allConfigs) {
        if (!configsByAccount[c.accountId]) configsByAccount[c.accountId] = [];
        configsByAccount[c.accountId].push(c);
    }

    const channelKeys = ['CHANNEL_INSTAGRAM_FEED', 'CHANNEL_INSTAGRAM_STORY', 'CHANNEL_INSTAGRAM_REELS', 'CHANNEL_WHATSAPP', 'CHANNEL_YOUTUBE_SHORTS'];
    const controlKeys = ['isActive', 'schedulerEnabled', 'PUBLISH_NEWS_ENABLED', 'PUBLISH_ORIGINALS_ENABLED'];

    for (const [accountId, configs] of Object.entries(configsByAccount)) {
        console.log(`\n  AccountId: "${accountId}"`);
        
        for (const key of [...controlKeys, ...channelKeys]) {
            const cfg = configs.find(c => c.key === key);
            if (cfg) {
                console.log(`    ${key}: ${JSON.stringify(cfg.value)}`);
            } else {
                console.log(`    ${key}: ❌ NÃO CONFIGURADO`);
            }
        }
        
        // Checar triggers
        const triggerCfg = configs.find(c => c.key === 'SCHEDULER_TRIGGERS');
        if (triggerCfg) {
            const triggers = Array.isArray(triggerCfg.value) ? triggerCfg.value : [];
            console.log(`    SCHEDULER_TRIGGERS: ${triggers.length} trigger(s)`);
            triggers.forEach((t: any) => console.log(`      - type=${t.type} value=${t.value || t.time} days=${JSON.stringify(t.days)}`));
        } else {
            console.log(`    SCHEDULER_TRIGGERS: ❌ NÃO CONFIGURADO`);
        }
    }

    // 3. Verificar se contas do .env têm config "isActive" no banco
    console.log('\n------------------------------------------------------');
    console.log('🔍 Cruzamento: contas do .env vs banco de dados:');
    
    for (const acc of accounts) {
        const normalizedId = acc.id.toLowerCase();
        const dbConfigs = configsByAccount[normalizedId] || [];
        
        const isActive = dbConfigs.find(c => c.key === 'isActive');
        const anyChannelOn = channelKeys.some(k => {
            const c = dbConfigs.find(cfg => cfg.key === k);
            return c && (c.value === true || c.value === 'true');
        });
        
        // Check if global fills the gap
        const globalConfigs = configsByAccount['global'] || [];
        const anyGlobalChannelOn = channelKeys.some(k => {
            const c = globalConfigs.find(cfg => cfg.key === k);
            return c && (c.value === true || c.value === 'true');
        });

        const isActiveValue = isActive?.value;
        const isActiveOk = isActiveValue !== false && isActiveValue !== 'false';

        console.log(`\n  → Conta "${acc.id}" (normalizada: "${normalizedId}")`);
        console.log(`    isActive: ${isActiveValue === undefined ? '⚠️ NÃO DEFINIDO (assume true)' : isActiveOk ? `✅ ${isActiveValue}` : `❌ ${isActiveValue}`}`);
        console.log(`    Canais específicos desta conta: ${anyChannelOn ? '✅ Pelo menos 1 ativo' : '❌ Nenhum canal ativo'}`);
        console.log(`    Canais da conta "global": ${anyGlobalChannelOn ? '✅ Pelo menos 1 ativo (herdado)' : '❌ Nenhum'}`);
        
        const willRun = isActiveOk && (anyChannelOn || anyGlobalChannelOn);
        console.log(`    ➡️  SERÁ EXECUTADA? ${willRun ? '✅ SIM' : '❌ NÃO'}`);
        
        if (!willRun) {
            if (!isActiveOk) console.log('       MOTIVO: isActive=false');
            if (!anyChannelOn && !anyGlobalChannelOn) console.log('       MOTIVO: Nenhum canal ativo (nem conta específica, nem global)');
        }
    }

    // 4. Posts pendentes/processados
    console.log('\n------------------------------------------------------');
    console.log('📊 Estado dos posts:');
    
    const postCounts = await prisma.post.groupBy({
        by: ['status', 'accountId'],
        _count: true
    });
    
    for (const pc of postCounts) {
        console.log(`  AccountId="${pc.accountId || 'null'}" | Status=${pc.status} | Count=${pc._count}`);
    }

    // 5. Últimas publicações sociais
    console.log('\n------------------------------------------------------');
    console.log('📤 Últimas 10 publicações sociais:');
    
    const lastPubs = await prisma.socialPublication.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    
    if (lastPubs.length === 0) {
        console.log('  ❌ NENHUMA publicação social registrada!');
    } else {
        lastPubs.forEach(p => {
            const statusIcon = p.status === 'SUCCESS' ? '✅' : p.status === 'FAILED' ? '❌' : '⏳';
            console.log(`  ${statusIcon} channel=${p.channel} | accountId="${p.accountId}" | status=${p.status} | error=${p.error?.slice(0, 80) || '-'}`);
        });
    }

    // 6. Últimas runs
    console.log('\n------------------------------------------------------');
    console.log('🏃 Últimas 10 AgentRuns:');
    
    const lastRuns = await prisma.agentRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10
    });
    
    if (lastRuns.length === 0) {
        console.log('  ❌ Nenhuma AgentRun registrada!');
    } else {
        lastRuns.forEach(r => {
            const statusIcon = r.status === 'SUCCESS' ? '✅' : r.status === 'FAILED' ? '❌' : '🔄';
            const dur = r.finishedAt ? `${Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000)}s` : 'em andamento';
            console.log(`  ${statusIcon} [${r.agentName}] ${r.status} | found=${r.postsFound} new=${r.postsNew} pub=${r.postsPublished} | dur=${dur} | err=${r.error?.slice(0, 80) || '-'}`);
        });
    }

    console.log('\n======================================================');
    console.log('         FIM DO DIAGNÓSTICO');
    console.log('======================================================\n');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
