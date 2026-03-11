import prisma from '@/lib/db';
import { getMergedConfigs } from '@/lib/db/config-helper';
import { ScraperAgent } from '@/lib/agents/scraper-agent';
import { InstagramScraperAgent } from '@/lib/agents/instagram-scraper-agent';
import { AnalysisAgent, BatchAnalyzedPost } from '@/lib/agents/analysis-agent';
import { PublisherAgent } from '@/lib/agents/publisher-agent';
import { composeSlideImage, composeStoryImage, rehostImage, rehostVideo, composeOriginalStoryImage, deleteHostedFile } from '../social/image-composer';
import { InstagramPublisher } from '@/lib/social/instagram';
import { WhatsAppPublisher } from '@/lib/social/whatsapp';
import { sleep } from '@/lib/utils';
import { PostStatus, RunStatus, Channel } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { sendErrorEmail } from '@/lib/alerts';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1000&auto=format&fit=crop';

/**
 * Orchestrator — Coordena o pipeline completo com isolamento por Conta
 */
export async function runPipeline(accountId: string): Promise<{
    postsFound: number;
    postsNew: number;
    postsPublished: number;
}> {
    const normalizedAccountId = accountId.toLowerCase();

    // --- BUSCAR CONFIGURAÇÕES DINÂMICAS MESCLADAS (Global + Conta) ---
    const configKeys = [
        'isActive',
        'SCRAPER_LIMIT_PER_SOURCE',
        'DATA_SOURCES',
        'THEMES',
        'IG_MONITOR_TARGETS',
        'CHANNEL_INSTAGRAM_FEED',
        'CHANNEL_INSTAGRAM_STORY',
        'CHANNEL_INSTAGRAM_REELS',
        'CHANNEL_WHATSAPP',
        'postingTimes',
        'feed_layout',
        'story_layout',
        'reels_layout'
    ];
    const configMap = await getMergedConfigs(normalizedAccountId, configKeys);

    if (configMap['isActive'] === false) {
        console.log(`[orchestrator|${normalizedAccountId}] Conta está desativada (isActive=false). Cancelando pipeline.`);
        return { postsFound: 0, postsNew: 0, postsPublished: 0 };
    }

    const isFeedEnabled = configMap['CHANNEL_INSTAGRAM_FEED'] === true;
    const isStoryEnabled = configMap['CHANNEL_INSTAGRAM_STORY'] === true;
    const isReelsEnabled = configMap['CHANNEL_INSTAGRAM_REELS'] === true;
    const isWhatsappEnabled = configMap['CHANNEL_WHATSAPP'] === true;

    if (!isFeedEnabled && !isStoryEnabled && !isReelsEnabled && !isWhatsappEnabled) {
        console.log(`[orchestrator|${accountId}] Nenhum canal de publicação ativo (Feed, Story, Reels, WhatsApp). Cancelando pipeline.`);
        return { postsFound: 0, postsNew: 0, postsPublished: 0 };
    }

    const scraperLimit = Number(configMap['SCRAPER_LIMIT_PER_SOURCE']) || Number(process.env.SCRAPER_LIMIT_PER_SOURCE) || 2;

    // Ler contas do env para obter os credenciais do Instagram
    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    let allAccounts: { id: string, name: string, userId: string, accessToken: string }[] = [];
    try {
        allAccounts = JSON.parse(allAccountsStr);
    } catch (e) { }

    const targetAccount = allAccounts.find(acc => acc.id.toLowerCase() === normalizedAccountId);
    if (!targetAccount) {
        throw new Error(`Account credentials for ID '${normalizedAccountId}' not found in INSTAGRAM_ACCOUNTS env var.`);
    }

    // Inicializar os Agentes isolados por conta
    let dataSources = configMap['DATA_SOURCES'] || [];
    if (typeof dataSources === 'string') {
        try { dataSources = JSON.parse(dataSources); } catch (e) { dataSources = []; }
    }

    let themes = configMap['THEMES'] || undefined;
    if (typeof themes === 'string') {
        try { themes = JSON.parse(themes); } catch (e) { }
    }

    let igTargets = configMap['IG_MONITOR_TARGETS'] || [];
    if (typeof igTargets === 'string') {
        try { igTargets = JSON.parse(igTargets); } catch (e) { igTargets = []; }
    }

    let feedLayout;
    try { feedLayout = typeof configMap['feed_layout'] === 'string' ? JSON.parse(configMap['feed_layout']) : configMap['feed_layout']; } catch (e) { }

    let storyLayout;
    try { storyLayout = typeof configMap['story_layout'] === 'string' ? JSON.parse(configMap['story_layout']) : configMap['story_layout']; } catch (e) { }

    let reelsLayout;
    try { reelsLayout = typeof configMap['reels_layout'] === 'string' ? JSON.parse(configMap['reels_layout']) : configMap['reels_layout']; } catch (e) { }

    const scraper = new ScraperAgent(scraperLimit, normalizedAccountId, dataSources);
    const instagramScraper = new InstagramScraperAgent();
    const analysis = new AnalysisAgent(themes);

    // --- CONCURRENCY CHECK ---
    const activeRun = await prisma.agentRun.findFirst({
        where: {
            agentName: `orchestrator_${normalizedAccountId}`,
            status: RunStatus.RUNNING,
            startedAt: { gte: new Date(Date.now() - 20 * 60 * 1000) }
        }
    });

    if (activeRun) {
        console.log(`[orchestrator|${normalizedAccountId}] ⚠️ Já existe um pipeline em execução para esta conta. Abortando.`);
        return { postsFound: 0, postsNew: 0, postsPublished: 0 };
    }

    let run = await prisma.agentRun.create({
        data: { agentName: `orchestrator_${normalizedAccountId}`, status: RunStatus.RUNNING },
    });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`[orchestrator|${normalizedAccountId}] 🚀 Pipeline iniciado — Run: ${run.id}`);
    console.log(`${'='.repeat(50)}\n`);

    let postsFound = 0;
    let postsNew = 0;
    let postsPublished = 0;
    let batchResult: any = null;

    try {
        // ─── ETAPA 1: Scraping ───────────────────────────────
        await scraper.init();
        console.log(`[orchestrator|${normalizedAccountId}] Etapa 1/3: Scraping (Limit: ${scraperLimit})...`);
        const allItems = await scraper.scrape();

        console.log(`[orchestrator|${normalizedAccountId}] Verificando alvos do Instagram...`);
        const igItems = await instagramScraper.run(normalizedAccountId, igTargets, allAccounts);

        // Priorizar itens do Instagram (adicionar no início)
        allItems.unshift(...igItems);

        postsFound = allItems.length;

        const newItems = await scraper.filterNew(allItems);
        postsNew = newItems.length;

        await scraper.close();

        if (newItems.length === 0) {
            console.log(`[orchestrator|${normalizedAccountId}] Nenhuma notícia nova para analisar.`);
        } else {
            // ─── ETAPA 2: Análise Consolidada ─────────────────────
            const dbPendingPosts = await prisma.post.findMany({
                where: { accountId: normalizedAccountId, status: PostStatus.PENDING },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            console.log(`[orchestrator|${normalizedAccountId}] Encontrados ${dbPendingPosts.length} posts PENDING no banco.`);

            const currentPendingPosts: any[] = [];

            // Adicionar itens do DB
            for (const p of dbPendingPosts) {
                currentPendingPosts.push({
                    postId: p.id,
                    title: p.title,
                    body: p.body,
                    imageUrl: p.imageUrl,
                    tags: p.tags,
                    isNew: false,
                    postOriginal: (p.metadata as any)?.postOriginal === true,
                    metadata: p.metadata
                });
            }

            // Adicionar novos itens
            for (const item of newItems) {
                const postMetadata = item.postOriginal ? { postOriginal: true, ...(item.metadata || {}) } : undefined;

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
                        accountId: normalizedAccountId,
                        status: item.postOriginal ? PostStatus.PROCESSED : PostStatus.PENDING,
                        metadata: postMetadata,
                    },
                });
                currentPendingPosts.push({
                    postId: post.id,
                    title: item.title,
                    body: item.body || '',
                    imageUrl: item.imageUrl,
                    tags: item.tags,
                    isNew: true,
                    postOriginal: item.postOriginal,
                    metadata: postMetadata,
                } as any);
            }

            // Dividir posts em "Para Analisar" e "Para Manter Original"
            const postsToAnalyze = currentPendingPosts.filter(p => !p.postOriginal);

            try {
                if (postsToAnalyze.length > 0) {
                    console.log(`[orchestrator|${normalizedAccountId}] Chamando summarizer para ${postsToAnalyze.length} notícias...`);
                    batchResult = await analysis.summarizeBatch(
                        postsToAnalyze.map(p => ({ title: p.title, body: p.body }))
                    );
                    console.log(`[orchestrator|${normalizedAccountId}] ✅ Summarizer retornou com sucesso.`);

                    // Atualizar posts com os resultados da análise
                    console.log(`[orchestrator|${normalizedAccountId}] Processando posts analisados...`);
                    for (let i = 0; i < postsToAnalyze.length; i++) {
                        const p = postsToAnalyze[i];
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
                    console.log(`[orchestrator|${normalizedAccountId}] ✅ Posts atualizados para PROCESSED.`);
                } else {
                    console.log(`[orchestrator|${normalizedAccountId}] Nenhuma notícia nova para consolidar.`);
                }
            } catch (error) {
                console.error(`[orchestrator|${normalizedAccountId}] ⚠️ Erro na análise do lote:`, (error as Error).message);
            }
        }

        console.log(`\n[orchestrator|${normalizedAccountId}] --- Iniciando Stage 3 (Publicação) ---`);
        // ─── ETAPA 3: Publicação em Lote ─────────────────────
        // Agora buscamos TODOS os que estão PROCESSED no banco para esta conta
        const allPendingToPublish = await prisma.post.findMany({
            where: {
                status: PostStatus.PROCESSED,
                accountId: normalizedAccountId
            },
            take: 20 // limite de segurança por run
        });

        console.log(`[orchestrator|${normalizedAccountId}] Debug: allPendingToPublish.length = ${allPendingToPublish.length}`);

        if (allPendingToPublish.length === 0) {
            console.log(`[orchestrator|${normalizedAccountId}] Etapa 3/3: Nenhum post pronto para publicação (status=PROCESSED).`);
        } else {
            const originalCount = allPendingToPublish.filter(p => (p.metadata as any)?.postOriginal === true).length;
            const newsCount = allPendingToPublish.length - originalCount;
            console.log(`\n[orchestrator|${normalizedAccountId}] Etapa 3/3: Publicando ${allPendingToPublish.length} itens prontos (${originalCount} originais, ${newsCount} notícias)...`);

            // 1a. Instagram Feed & Reels (Original and News)
            if (isFeedEnabled || isReelsEnabled) {
                console.log(`[orchestrator|${normalizedAccountId}] Processando Instagram (Feed: ${isFeedEnabled}, Reels: ${isReelsEnabled})...`);
                try {
                    const carouselData = [];
                    const composedSlideItems: { imageUrl: string; postId: string }[] = [];
                    for (const p of allPendingToPublish) {
                        carouselData.push({
                            postId: p.id,
                            imageUrl: p.imageUrl || undefined,
                            title: p.title,
                            summary: p.body,
                            postOriginal: (p.metadata as any)?.postOriginal === true,
                            metadata: p.metadata
                        });
                    }

                    const igPublisher = new InstagramPublisher(targetAccount.accessToken, targetAccount.userId);

                    for (let i = 0; i < carouselData.length; i++) {
                        const c = carouselData[i];
                        try {
                            if (c.postOriginal && c.imageUrl) {
                                const originalUsername = (c.metadata as any)?.originalUsername;
                                const mediaType = (c.metadata as any)?.mediaType;
                                let caption = originalUsername ? `Créditos: @${originalUsername}\n\n${c.summary}` : c.summary;

                                if (mediaType === 'VIDEO' || mediaType === 'REELS' || c.imageUrl?.includes('.mp4') || c.imageUrl?.includes('video')) {
                                    if (isReelsEnabled) {
                                        console.log(`[orchestrator|${normalizedAccountId}] Publicando Reels original de @${originalUsername}`);

                                        // Tentar usar URL original se possível, para economizar storage (conforme pedido do usuário)
                                        // Mas re-rehosting ainda é feito se falhar ou se for necessário para compatibilidade
                                        let videoToPublish = c.imageUrl;
                                        let tempFile = '';

                                        // Para republicações, o usuário pediu: "tente somente... obter os dados originais, se não for possível não faça nada"
                                        // Mas Reels muitas vezes exigem rehosting porque as URLs expiram. 
                                        // Vamos tentar o rehost básico para garantir sucesso, mas com limpeza agressiva.
                                        const rehostResult = await rehostVideo(c.imageUrl);
                                        videoToPublish = rehostResult.publicUrl;
                                        tempFile = rehostResult.filename;

                                        const collaborators = originalUsername ? [originalUsername] : undefined;
                                        const result = await igPublisher.publishVideo(videoToPublish, caption, originalUsername, collaborators);

                                        // Limpeza imediata após publicação
                                        if (tempFile) {
                                            await deleteHostedFile(tempFile);
                                        }

                                        if (result?.postId) {
                                            await prisma.socialPublication.create({
                                                data: {
                                                    postId: c.postId,
                                                    channel: 'INSTAGRAM_REELS' as any,
                                                    accountId: normalizedAccountId,
                                                    externalId: result.postId,
                                                    status: 'SUCCESS'
                                                }
                                            });
                                            await prisma.post.update({
                                                where: { id: c.postId },
                                                data: { status: PostStatus.PUBLISHED }
                                            });
                                            postsPublished++;
                                            console.log(`[orchestrator|${normalizedAccountId}] ✅ Reels original publicado e registrado.`);
                                        } else {
                                            console.log(`[orchestrator|${normalizedAccountId}] ⚠️ Falha ao obter postId para Reels original de @${originalUsername}.`);
                                        }
                                    } else if (isFeedEnabled) {
                                        console.log(`[orchestrator|${normalizedAccountId}] Publicando vídeo no Feed original de @${originalUsername}`);
                                        const rehostResult = await rehostVideo(c.imageUrl);
                                        const collaborators = originalUsername ? [originalUsername] : undefined;
                                        const result = await igPublisher.publishVideo(rehostResult.publicUrl, caption, originalUsername, collaborators);

                                        // Limpeza imediata
                                        if (rehostResult.filename) {
                                            await deleteHostedFile(rehostResult.filename);
                                        }

                                        if (result?.postId) {
                                            await prisma.socialPublication.create({
                                                data: {
                                                    postId: c.postId,
                                                    channel: Channel.INSTAGRAM_FEED,
                                                    accountId: normalizedAccountId,
                                                    externalId: result.postId,
                                                    status: 'SUCCESS'
                                                }
                                            });
                                            await prisma.post.update({
                                                where: { id: c.postId },
                                                data: { status: PostStatus.PUBLISHED }
                                            });
                                            postsPublished++;
                                            console.log(`[orchestrator|${normalizedAccountId}] ✅ Vídeo no Feed original publicado e registrado.`);
                                        } else {
                                            console.log(`[orchestrator|${normalizedAccountId}] ⚠️ Falha ao obter postId para vídeo no Feed original de @${originalUsername}.`);
                                        }
                                    }
                                } else if (isFeedEnabled) {
                                    console.log(`[orchestrator|${normalizedAccountId}] Re-hospedando imagem de @${originalUsername} para o Feed`);
                                    const rehosted = await rehostImage(c.imageUrl, 'ig-original');
                                    const collaborators = originalUsername ? [originalUsername] : undefined;
                                    const result = await igPublisher.publishFeed(rehosted, caption, originalUsername, collaborators);
                                    if (result?.postId) {
                                        await prisma.socialPublication.create({
                                            data: {
                                                postId: c.postId,
                                                channel: Channel.INSTAGRAM_FEED,
                                                accountId: normalizedAccountId,
                                                externalId: result.postId,
                                                status: 'SUCCESS'
                                            }
                                        });
                                        await prisma.post.update({
                                            where: { id: c.postId },
                                            data: { status: PostStatus.PUBLISHED }
                                        });
                                        postsPublished++;
                                        console.log(`[orchestrator|${normalizedAccountId}] ✅ Imagem Feed original publicada.`);
                                    }
                                } else {
                                    console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Post original @${originalUsername} pulado (MediaType: ${mediaType}, ReelsEnabled: ${isReelsEnabled}, FeedEnabled: ${isFeedEnabled})`);
                                }

                                // Atraso entre publicações individuais para evitar rate limit
                                await sleep(2000);

                            } else if (!c.postOriginal && isFeedEnabled) {
                                console.log(`[orchestrator|${normalizedAccountId}] Compondo slide ${i + 1} para Carrossel: ${c.title}`);
                                const composed = await composeSlideImage(
                                    c.imageUrl,
                                    c.title,
                                    c.summary,
                                    i,
                                    feedLayout
                                );
                                composedSlideItems.push({ imageUrl: composed.publicUrl, postId: c.postId });
                            }
                        } catch (itemErr) {
                            console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro no item ${i} do Instagram:`, (itemErr as Error).message);
                        }
                    }

                    // Publicar Carrossel se houver itens compostos (somente Feed)
                    if (isFeedEnabled && composedSlideItems.length > 0) {
                        try {
                            // Se for notícia composta, gera uma legenda global se houver
                            const globalCaption = batchResult?.globalCaption || 'Confira as novidades do dia!';

                            if (composedSlideItems.length === 1) {
                                await igPublisher.publishFeed(composedSlideItems[0].imageUrl, globalCaption);
                            } else {
                                await igPublisher.publishCarousel(composedSlideItems.map(item => ({ imageUrl: item.imageUrl })), globalCaption);
                            }

                            // Registrar e marcar posts do carrossel
                            for (const item of composedSlideItems) {
                                await prisma.socialPublication.create({
                                    data: { postId: item.postId, channel: Channel.INSTAGRAM_FEED, accountId: normalizedAccountId, status: 'SUCCESS' }
                                });
                                await prisma.post.update({ where: { id: item.postId }, data: { status: PostStatus.PUBLISHED } });
                            }
                            postsPublished++;
                        } catch (carouselErr) {
                            console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro ao publicar Carrossel Instagram:`, (carouselErr as Error).message);
                        }
                    }
                } catch (err) {
                    console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro fatal processando Instagram Feed/Reels:`, (err as Error).message);
                }
            } else {
                console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando Instagram Feed/Reels (canais desativados)`);
            }


            // 1b. Instagram Story — formato 9:16 vertical
            if (configMap['CHANNEL_INSTAGRAM_STORY'] === true) {
                console.log(`[orchestrator|${normalizedAccountId}] Publicando Stories no Instagram (${allPendingToPublish.length} itens)...`);
                try {
                    const igPublisher = new InstagramPublisher(targetAccount.accessToken, targetAccount.userId);

                    // Seleção diversa: pegar até 3 Reels originais e até 3 News analisadas
                    const availableOriginals = allPendingToPublish.filter(p => (p.metadata as any)?.postOriginal === true);
                    const availableNews = allPendingToPublish.filter(p => (p.metadata as any)?.postOriginal !== true);

                    console.log(`[orchestrator|${normalizedAccountId}] Stories disponíveis: ${availableOriginals.length} originais, ${availableNews.length} notícias.`);

                    const storyItems = [...availableOriginals.slice(0, 3), ...availableNews.slice(0, 3)];
                    console.log(`[orchestrator|${normalizedAccountId}] Itens selecionados para Stories: ${storyItems.length}`);

                    for (let i = 0; i < storyItems.length; i++) {
                        const item = storyItems[i];
                        try {
                            const isOriginal = (item.metadata as any)?.postOriginal === true;
                            const isVideo = item.imageUrl?.includes('.mp4') || (item.metadata as any)?.isReels === true || (item.metadata as any)?.mediaType === 'VIDEO';
                            console.log(`[orchestrator|${normalizedAccountId}] Processando Story ${i + 1}/${storyItems.length}: "${item.title.slice(0, 30)}..." (Original: ${isOriginal}, Vídeo: ${isVideo})`);

                            let published = false;
                            let externalId = 'STORY_' + Date.now();

                            if (isVideo && item.imageUrl) {
                                // Story de Vídeo
                                console.log(`[orchestrator|${normalizedAccountId}] Re-hospedando vídeo para Story...`);
                                const rehostResult = await rehostVideo(item.imageUrl, 'story-vid');
                                try {
                                    const pubResult = await igPublisher.publishStoryVideo(rehostResult.publicUrl);
                                    externalId = pubResult.postId;
                                    published = true;
                                    console.log(`[orchestrator|${normalizedAccountId}] Story Vídeo publicado: ${externalId}`);
                                } finally {
                                    await deleteHostedFile(rehostResult.filename);
                                }
                            } else {
                                const storyImgUrl = item.imageUrl || FALLBACK_IMAGE;
                                console.log(`[orchestrator|${normalizedAccountId}] Compondo imagem para Story (usando fallback se necessário)...`);

                                let finalStoryUrl: string;
                                if (isOriginal) {
                                    const storyComposed = await composeOriginalStoryImage(storyImgUrl);
                                    finalStoryUrl = storyComposed.publicUrl;
                                } else {
                                    const storyComposed = await composeStoryImage(
                                        storyImgUrl,
                                        item.title,
                                        item.body.slice(0, 250),
                                        { fontColor: configMap['primaryColor'] || '#ffffff' }
                                    );
                                    finalStoryUrl = storyComposed.publicUrl;
                                }

                                const pubResult = await igPublisher.publishStory(finalStoryUrl);
                                externalId = pubResult.postId;
                                published = true;
                                console.log(`[orchestrator|${normalizedAccountId}] Story Imagem publicado: ${externalId}`);
                            }

                            if (published) {
                                // Registrar publicação no banco
                                await prisma.socialPublication.create({
                                    data: {
                                        postId: item.id,
                                        accountId: normalizedAccountId,
                                        channel: 'INSTAGRAM_STORY' as any,
                                        externalId,
                                        status: 'SUCCESS'
                                    }
                                }).catch(() => { });

                                // Marcar post como publicado
                                await prisma.post.update({
                                    where: { id: item.id },
                                    data: { status: PostStatus.PUBLISHED }
                                }).catch(() => { });

                                postsPublished++;
                            } else {
                                console.warn(`[orchestrator|${normalizedAccountId}] Story pulado por falta de mídia válida.`);
                            }

                            await sleep(2000); // Pequena pausa entre stories

                        } catch (itemErr: any) {
                            console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro no item ${i + 1} do Story:`, itemErr.message);
                        }
                    }

                    console.log(`[orchestrator|${normalizedAccountId}] ✅ Processamento Instagram Stories finalizado.`);
                } catch (storyErr) {
                    console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro geral no bloco de Stories:`, (storyErr as Error).message);
                }
            } else {
                console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando Instagram Story (desativado ou herança global false)`);
            }

            // 1c. Instagram Reels - Informações adicionais
            if (isReelsEnabled) {
                console.log(`[orchestrator|${normalizedAccountId}] 🎬 Reels ativado. Vídeos originais processados no bloco principal.`);
            }

            // 2. WhatsApp - Optional
            if (configMap['CHANNEL_WHATSAPP'] === true) {
                console.log(`[orchestrator|${normalizedAccountId}] Enviando para WhatsApp...`);
                try {
                    const whatsapp = new WhatsAppPublisher();
                    const waText = batchResult?.whatsappConsolidated || 'Confira as novidades do dia!';
                    await whatsapp.sendText(`*Notícias para [${targetAccount.name}]*\n\n${waText}`);
                    console.log(`[orchestrator|${normalizedAccountId}] ✅ WhatsApp OK`);
                    postsPublished++;
                } catch (waErr: any) {
                    console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro WhatsApp:`, (waErr as Error).message);
                }
            } else {
                console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando WhatsApp (desativado ou herança global false)`);
            }

        }

        // Atualizar status do run para SUCCESS - movido para fora do bloco else para garantir que sempre rode
        await prisma.agentRun.update({
            where: { id: run.id },
            data: {
                status: RunStatus.SUCCESS,
                postsFound,
                postsNew,
                postsPublished,
                finishedAt: new Date()
            }
        });

        return { postsFound, postsNew, postsPublished };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[orchestrator|${normalizedAccountId}] 💥 ERRO CRÍTICO: ${error}`);

        // Tentamos registrar a falha se run.id existir
        try {
            const runId = (run as any)?.id;
            if (runId) {
                await prisma.agentRun.update({
                    where: { id: runId },
                    data: { status: RunStatus.FAILED, error, finishedAt: new Date() },
                });
            }
        } catch (e) { }

        const whatsapp = new WhatsAppPublisher();
        await Promise.allSettled([
            whatsapp.sendAlert(`💥 Erro Crítico [${normalizedAccountId}]: ${error}`),
            sendErrorEmail(`Erro crítico no Orchestrator [${normalizedAccountId}]`, error)
        ]);

        throw err;
    }

    return { postsFound, postsNew, postsPublished };
}
