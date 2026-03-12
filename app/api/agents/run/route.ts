import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/agents/orchestrator';
import prisma from '@/lib/db';
import { getMergedConfigs } from '@/lib/db/config-helper';
import { rateLimit } from '@/lib/rate-limit';

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
            (async () => {
                const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                for (let i = 0; i < accountsToRun.length; i++) {
                    const accountId = accountsToRun[i];
                    console.log(`[API-BKG] Iniciando pipeline para ${accountId} (${i + 1}/${accountsToRun.length})`);
                    try {
                        await runPipeline(accountId);
                    } catch (err) {
                        console.error(`[API-BKG] Erro no pipeline manual [${accountId}]:`, err);
                    }

                    // Delay before next account
                    if (i < accountsToRun.length - 1) {
                        console.log(`[API-BKG] Aguardando 1 minuto antes da próxima conta para evitar bloqueios...`);
                        await sleep(60000); // 1 minuto de intervalo
                    }
                }
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
