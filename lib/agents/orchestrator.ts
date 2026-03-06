import prisma from '@/lib/db';
import { ScraperAgent } from '@/lib/agents/scraper-agent';
import { AnalysisAgent, BatchAnalyzedPost } from '@/lib/agents/analysis-agent';
import { PublisherAgent } from '@/lib/agents/publisher-agent';
import { composeSlideImage, composeStoryImage } from '@/lib/social/image-composer';
import { InstagramPublisher } from '@/lib/social/instagram';
import { WhatsAppPublisher } from '@/lib/social/whatsapp';
import { sleep } from '@/lib/utils';
import { PostStatus, RunStatus } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { sendErrorEmail } from '@/lib/alerts';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1000&auto=format&fit=crop';

/**
 * Orchestrator — Coordena o pipeline completo com otimização de custos (Batch Analysis)
 */
export async function runPipeline(): Promise<{
    postsFound: number;
    postsNew: number;
    postsPublished: number;
}> {
    // --- BUSCAR CONFIGURAÇÕES DINÂMICAS ---
    const configs = await prisma.systemConfig.findMany();
    const configMap = configs.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, any>);

    const scraperLimit = Number(configMap['SCRAPER_LIMIT_PER_SOURCE']) || Number(process.env.SCRAPER_LIMIT_PER_SOURCE) || 2;
    const whatsappDelay = Number(configMap['WHATSAPP_BATCH_DELAY']) || Number(process.env.WHATSAPP_BATCH_DELAY) || 60000;

    // Passar o limite para o scraper (precisamos ajustar o método init ou scrape do ScraperAgent)
    const scraper = new ScraperAgent(scraperLimit);
    const analysis = new AnalysisAgent();
    const publisher = new PublisherAgent();
    const whatsapp = new WhatsAppPublisher();

    let run = await prisma.agentRun.create({
        data: { agentName: 'orchestrator', status: RunStatus.RUNNING },
    });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`[orchestrator] 🚀 Pipeline iniciado — Run: ${run.id}`);
    console.log(`${'='.repeat(50)}\n`);

    let postsFound = 0;
    let postsNew = 0;
    let postsPublished = 0;

    try {
        // ─── ETAPA 1: Scraping ───────────────────────────────
        await scraper.init();
        console.log('[orchestrator] Etapa 1/3: Scraping...');
        const allItems = await scraper.scrape();
        postsFound = allItems.length;

        const newItems = await scraper.filterNew(allItems);
        postsNew = newItems.length;

        await scraper.close();

        if (newItems.length === 0) {
            console.log('[orchestrator] Nenhuma notícia nova. Encerrando.');
            await prisma.agentRun.update({
                where: { id: run.id },
                data: {
                    status: RunStatus.SUCCESS,
                    postsFound,
                    postsNew: 0,
                    postsPublished: 0,
                    finishedAt: new Date(),
                },
            });
            return { postsFound, postsNew: 0, postsPublished: 0 };
        }

        // ─── ETAPA 2: Análise Consolidada ─────────────────────
        console.log(`\n[orchestrator] Etapa 2/3: Criando posts e analisando lote (${newItems.length} itens)...`);

        const pendingPosts: { postId: string; title: string; body: string; imageUrl?: string; tags: string[] }[] = [];

        for (const item of newItems) {
            const post = await prisma.post.create({
                data: {
                    sourceId: item.sourceId,
                    title: item.title,
                    body: item.body || '',
                    imageUrl: item.imageUrl,
                    hashtags: [],
                    originalUrl: item.originalUrl ?? null,
                    sourceName: item.sourceName,
                    tags: item.tags,
                    rawContent: item.rawContent,
                    status: PostStatus.PROCESSING,
                },
            });
            pendingPosts.push({
                postId: post.id,
                title: item.title,
                body: item.body || '',
                imageUrl: item.imageUrl,
                tags: item.tags
            });
        }

        const batchResult: BatchAnalyzedPost = await analysis.summarizeBatch(
            pendingPosts.map(p => ({ title: p.title, body: p.body }))
        );

        // Atualizar posts com os resultados da análise
        for (let i = 0; i < pendingPosts.length; i++) {
            const p = pendingPosts[i];
            const analyzed = batchResult.items[i];
            if (analyzed) {
                await prisma.post.update({
                    where: { id: p.postId },
                    data: {
                        title: analyzed.title,
                        body: analyzed.summary,
                        hashtags: analyzed.hashtags,
                        status: PostStatus.PROCESSED,
                        processedAt: new Date(),
                    },
                });
            }
        }

        // ─── ETAPA 3: Publicação em Lote ─────────────────────
        console.log('\n[orchestrator] Etapa 3/3: Publicando resultados...');

        // 1a. Instagram Carousel
        let firstSlideUrl: string | undefined;
        if (configMap['CHANNEL_INSTAGRAM_FEED'] !== false) {
            console.log('[orchestrator] Instalando Carrossel no Instagram...');
            try {
                const carouselData = pendingPosts.map((p, idx) => ({
                    imageUrl: p.imageUrl || undefined,
                    title: batchResult.items[idx]?.title || p.title,
                    summary: batchResult.items[idx]?.summary || ''
                }));

                // Pré-compor o primeiro slide para reutilizar no Story
                const firstItem = carouselData[0];
                const firstComposed = await composeSlideImage(
                    firstItem.imageUrl, firstItem.title, firstItem.summary, 0
                );
                firstSlideUrl = firstComposed.publicUrl;

                await publisher.publishCarousel(
                    pendingPosts.map(p => p.postId),
                    carouselData,
                    batchResult.globalCaption
                );
                console.log('[orchestrator] ✅ Instagram Carrossel OK');
            } catch (igErr) {
                console.error('[orchestrator] ❌ Erro Instagram Carrossel:', (igErr as Error).message);
            }
        } else {
            console.log('[orchestrator] ⏭️ Pulando Instagram Feed (desativado nas configurações)');
        }

        // 1b. Instagram Story — formato 9:16 com texto próprio
        if (configMap['CHANNEL_INSTAGRAM_STORY'] !== false) {
            console.log('[orchestrator] Publicando Story no Instagram...');
            try {
                const firstItem = pendingPosts[0];
                const firstAnalyzed = batchResult.items[0];
                const storyComposed = await composeStoryImage(
                    firstItem.imageUrl ?? undefined,
                    firstAnalyzed?.title ?? firstItem.title,
                    firstAnalyzed?.summary ?? firstItem.body.slice(0, 200),
                );
                const activeIgAccIds: string[] = Array.isArray(configMap['ACTIVE_INSTAGRAM_ACCOUNTS']) ? configMap['ACTIVE_INSTAGRAM_ACCOUNTS'] : [];
                const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS;
                let allAccounts: { id: string, name: string, userId: string, accessToken: string }[] = [];
                try {
                    allAccounts = allAccountsStr ? JSON.parse(allAccountsStr) : [];
                } catch (e) { }
                const activeAccountsToUse = activeIgAccIds.length > 0
                    ? allAccounts.filter(acc => activeIgAccIds.includes(acc.id))
                    : allAccounts.slice(0, 1);

                for (const acc of activeAccountsToUse) {
                    const igPublisher = new InstagramPublisher(acc.accessToken, acc.userId);
                    await igPublisher.publishStory(storyComposed.publicUrl);
                }
                console.log('[orchestrator] ✅ Instagram Story OK');
            } catch (storyErr) {
                console.error('[orchestrator] ❌ Erro Instagram Story:', (storyErr as Error).message);
            }
        } else {
            console.log('[orchestrator] ⏭️ Pulando Instagram Story (desativado nas configurações)');
        }

        // 2. WhatsApp
        if (configMap['CHANNEL_WHATSAPP'] !== false) {
            console.log('[orchestrator] Enviando para WhatsApp...');
            try {
                // Enviar apenas uma mensagem consolidada com todas as notícias
                await whatsapp.sendText(batchResult.whatsappConsolidated);
                console.log('[orchestrator] ✅ WhatsApp (Consolidado) OK');

                // Marcar posts como publicados no banco
                for (const p of pendingPosts) {
                    await prisma.post.update({
                        where: { id: p.postId },
                        data: { status: PostStatus.PUBLISHED }
                    });
                    postsPublished++;
                }
            } catch (waErr: any) {
                console.error('[orchestrator] ❌ Erro WhatsApp:', (waErr as Error).message);
            }
        } else {
            console.log('[orchestrator] ⏭️ Pulando WhatsApp (desativado nas configurações)');
            // Marcar posts como publicados no banco mesmo sem WhatsApp, para que não fiquem travados no pipeline
            for (const p of pendingPosts) {
                await prisma.post.update({
                    where: { id: p.postId },
                    data: { status: PostStatus.PUBLISHED }
                });
                postsPublished++;
            }
        }

        // FINALIZAR RUN
        await prisma.agentRun.update({
            where: { id: run.id },
            data: {
                status: RunStatus.SUCCESS,
                postsFound,
                postsNew,
                postsPublished,
                finishedAt: new Date(),
            },
        });

        console.log(`\n${'='.repeat(50)}`);
        console.log(`[orchestrator] 🏁 Pipeline concluído: ${postsPublished} publicados.`);
        console.log(`${'='.repeat(50)}\n`);

        return { postsFound, postsNew, postsPublished };

    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[orchestrator] 💥 ERRO CRÍTICO: ${error}`);

        await prisma.agentRun.update({
            where: { id: run.id },
            data: { status: RunStatus.FAILED, error, finishedAt: new Date() },
        });

        await Promise.allSettled([
            whatsapp.sendAlert(`💥 Erro Crítico: ${error}`),
            sendErrorEmail('Erro crítico no Orchestrator', error)
        ]);

        throw err;
    }
}
