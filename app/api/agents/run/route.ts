import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/agents/orchestrator';
import prisma from '@/lib/db';
import { getMergedConfigs } from '@/lib/db/config-helper';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        
        // Limite de 5 execuções manuais a cada 10 minutos por IP
        if (!rateLimit(ip, 5, 600000)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Muitas requisições. Tente novamente em alguns minutos.' 
            }, { status: 429 });
        }

        console.log('[API] Pipeline iniciado manualmente via dashboard (todas as contas ativas)');

        const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
        let allAccounts: { id: string, name: string }[] = [];
        try {
            allAccounts = JSON.parse(allAccountsStr);
        } catch (e) { }

        // Prepare accounts to run
        const accountsToRun = [];

        for (const account of allAccounts) {
            const configMap = await getMergedConfigs(account.id, [
                'isActive',
                'CHANNEL_INSTAGRAM_FEED',
                'CHANNEL_INSTAGRAM_STORY',
                'CHANNEL_INSTAGRAM_REELS',
                'CHANNEL_WHATSAPP',
                'CHANNEL_YOUTUBE_SHORTS'
            ]);

            if (configMap['isActive'] !== false) {
                const isFeedEnabled = configMap['CHANNEL_INSTAGRAM_FEED'] === true;
                const isStoryEnabled = configMap['CHANNEL_INSTAGRAM_STORY'] === true;
                const isReelsEnabled = configMap['CHANNEL_INSTAGRAM_REELS'] === true;
                const isWhatsappEnabled = configMap['CHANNEL_WHATSAPP'] === true;
                const isYoutubeEnabled = configMap['CHANNEL_YOUTUBE_SHORTS'] === true;

                if (isFeedEnabled || isStoryEnabled || isReelsEnabled || isWhatsappEnabled || isYoutubeEnabled) {
                    accountsToRun.push(account.id);
                } else {
                    console.log(`[API] Pulando ${account.id} (Nenhum canal ativo)`);
                }
            }
        }

        // Run sequentially in background with a 1-minute delay between accounts
        if (accountsToRun.length > 0) {
            // Criar um run "Pai" para rastrear o progresso do lote manual
            const parentRun = await prisma.agentRun.create({
                data: {
                    agentName: 'Execução Manual (Dashboard)',
                    status: 'RUNNING'
                }
            });

            (async () => {
                const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                let totalFound = 0;
                let totalNew = 0;
                let totalPublished = 0;

                for (let i = 0; i < accountsToRun.length; i++) {
                    const accountId = accountsToRun[i];
                    console.log(`[API-BKG] Iniciando pipeline para ${accountId} (${i + 1}/${accountsToRun.length})`);
                    try {
                        const result = await runPipeline(accountId);
                        totalFound += result.postsFound || 0;
                        totalNew += result.postsNew || 0;
                        totalPublished += result.postsPublished || 0;
                    } catch (err) {
                        console.error(`[API-BKG] Erro no pipeline manual [${accountId}]:`, err);
                    }

                    // Delay antes da próxima conta para evitar bloqueios
                    if (i < accountsToRun.length - 1) {
                        console.log(`[API-BKG] Aguardando 1 minuto antes da próxima conta para evitar bloqueios...`);
                        await sleep(60000); 
                    }
                }

                // Finalizar o run pai com os totais
                await prisma.agentRun.update({
                    where: { id: parentRun.id },
                    data: {
                        status: 'SUCCESS',
                        postsFound: totalFound,
                        postsNew: totalNew,
                        postsPublished: totalPublished,
                        finishedAt: new Date()
                    }
                });

                console.log(`[API-BKG] Todos os pipelines manuais foram finalizados.`);
            })();
        }

        let startedCount = accountsToRun.length;

        return NextResponse.json({ success: true, message: `Pipelines iniciados em background para ${startedCount} contas ativas.` });
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Erro desconhecido';
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Use POST para executar o pipeline' }, { status: 405 });
}
