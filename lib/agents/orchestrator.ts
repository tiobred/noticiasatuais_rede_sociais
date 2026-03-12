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
        'POSTING_TIMES',
        'FEED_LAYOUT',
        'STORY_LAYOUT',
        'REELS_LAYOUT',
        'feed_layout',
        'story_layout',
        'reels_layout',
        'CHANNEL_YOUTUBE_SHORTS',
        'NICHE'
    ];
    const configMap = await getMergedConfigs(normalizedAccountId, configKeys);

    if (configMap['isActive'] === false) {
        console.log(`[orchestrator|${normalizedAccountId}] Conta está desativada (isActive=false). Cancelando pipeline.`);
        return { postsFound: 0, postsNew: 0, postsPublished: 0 };
    }

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

    /**
     * Helper para verificar se um post (ou a mesma URL original) já foi publicado neste canal para esta conta.
     */
    async function isAlreadyPublished(postId: string, originalUrl: string | null, channel: Channel): Promise<boolean> {
        const conditions: any[] = [{ postId: postId, channel: channel, status: 'SUCCESS', accountId: normalizedAccountId }];
        if (originalUrl) {
            conditions.push({ post: { originalUrl: originalUrl }, channel: channel, status: 'SUCCESS', accountId: normalizedAccountId });
        }
        const existing = await prisma.socialPublication.findFirst({
            where: {
                OR: conditions
            }
        });
        return !!existing;
    }

    // Helper para verificar se um canal está habilitado. 
    // Prioriza DB (configMap). Se for explicitamente boolean, usa. 
    // Caso contrário (undefined/null), recorre ao env.
    const isChannelEnabled = (channelKey: string) => {
        const dbValue = configMap[channelKey];
        if (typeof dbValue === 'boolean') return dbValue;
        if (dbValue === 'true' || dbValue === true) return true;
        if (dbValue === 'false' || dbValue === false) return false;
        
        return process.env[channelKey] === 'true';
    };

    const isFeedEnabled = isChannelEnabled('CHANNEL_INSTAGRAM_FEED');
    const isStoryEnabled = isChannelEnabled('CHANNEL_INSTAGRAM_STORY');
    const isReelsEnabled = isChannelEnabled('CHANNEL_INSTAGRAM_REELS');
    const isWhatsappEnabled = isChannelEnabled('CHANNEL_WHATSAPP');
    const isYoutubeEnabled = isChannelEnabled('CHANNEL_YOUTUBE_SHORTS');

    if (!isFeedEnabled && !isStoryEnabled && !isReelsEnabled && !isWhatsappEnabled && !isYoutubeEnabled) {
        console.log(`[orchestrator|${accountId}] Nenhum canal de publicação ativo (Feed, Story, Reels, WhatsApp, YouTube). Cancelando pipeline.`);
        return { postsFound: 0, postsNew: 0, postsPublished: 0 };
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

    const parseLayout = (val: any) => {
        if (!val) return null;
        if (typeof val === 'object') return val;
        try { return JSON.parse(val); } catch (e) { return null; }
    };

    const fLayout = parseLayout(configMap['feed_layout'] || configMap['FEED_LAYOUT']);
    const sLayout = parseLayout(configMap['story_layout'] || configMap['STORY_LAYOUT']);
    const rLayout = parseLayout(configMap['reels_layout'] || configMap['REELS_LAYOUT']);

    console.log(`[orchestrator|${normalizedAccountId}] Layouts carregados: Feed=${!!fLayout}, Story=${!!sLayout}, Reels=${!!rLayout}`);
    if (sLayout) {
        console.log(`[orchestrator|${normalizedAccountId}] ℹ️ Story Layout Font Sizes: Title=${sLayout.fontSizeTitle}, Body=${sLayout.fontSizeBody}`);
    }

    const scraperLimit = Number(configMap['SCRAPER_LIMIT_PER_SOURCE']) || Number(process.env.SCRAPER_LIMIT_PER_SOURCE) || 5;
    const niche = configMap['NICHE'] || '';
    const consolidatedThemes = themes ? `${themes}\n\nFOCO/NICHE:\n${niche}` : niche;

    const scraper = new ScraperAgent(scraperLimit, normalizedAccountId, dataSources);
    const instagramScraper = new InstagramScraperAgent();
    const analysis = new AnalysisAgent(consolidatedThemes);
    const publisherAgent = new PublisherAgent();

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

        const filteredItems = (await scraper.filterNew(allItems)).filter(item => {
            const title = (item.title || '').toUpperCase();
            const body = (item.body || '').trim().toUpperCase();
            const raw = (item.rawContent || '').toUpperCase();

            // Filtro contra posts de teste / vazios / lives / propagandas
            const isSuspect = 
                title.includes('LIVE') || 
                title.includes('TESTE') || 
                title.includes('CHECK OUT') ||
                title.includes('AD:') ||
                body.length < 15 || 
                (title.length < 5 && body.length < 25) || 
                body.includes('CONTEÚDO_TESTE') ||
                body.includes('TEST CONTENT');

            if (isSuspect) {
                console.log(`[orchestrator|${normalizedAccountId}] 🚫 Filtrando post suspeito ou vazio: "${title}" (Body length: ${body.length})`);
                return false;
            }
            return true;
        });
        const newItems = filteredItems;
        postsNew = newItems.length;

        await scraper.close();

        const dbPendingPosts = await prisma.post.findMany({
            where: { accountId: normalizedAccountId, status: PostStatus.PENDING },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        if (newItems.length === 0 && dbPendingPosts.length === 0) {
            console.log(`[orchestrator|${normalizedAccountId}] Nenhuma notícia nova para analisar e nenhum post pendente.`);
        } else {
            // ─── ETAPA 2: Análise Consolidada ─────────────────────
            console.log(`[orchestrator|${normalizedAccountId}] Iniciando análise: ${newItems.length} novos, ${dbPendingPosts.length} pendentes no banco.`);

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

            // Filtrar posts pendentes vindos do banco contra lixo/vazio (segunda camada de proteção)
            const filteredPending = currentPendingPosts.filter(p => {
                const t = (p.title || '').toUpperCase();
                const b = (p.body || '').trim().toUpperCase();
                
                return !(
                    t.includes('LIVE') || 
                    t.includes('TESTE') || 
                    t.includes('AD:') ||
                    (t.length < 5 && b.length < 25) ||
                    b.includes('CONTEÚDO_TESTE')
                );
            });
            
            // Substituir a lista original pela filtrada
            currentPendingPosts.splice(0, currentPendingPosts.length, ...filteredPending);

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

            // Dividir posts em "Para Analisar" e "Para Manter Original" (Limite de 8 por lote)
            const postsToAnalyze = currentPendingPosts.filter(p => !p.postOriginal).slice(0, 8);
            const postsSkipped = currentPendingPosts.filter(p => !p.postOriginal).slice(8);

            if (postsSkipped.length > 0) {
                console.log(`[orchestrator|${normalizedAccountId}] ⚠️ ${postsSkipped.length} notícias excederam o limite do lote e serão processadas em outro momento.`);
            }

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

        // Stage 3 Safety Filter: Remover posts vazios ou de teste que passaram pelas etapas anteriores
        const allPendingToPublish = (await prisma.post.findMany({
            where: {
                status: PostStatus.PROCESSED,
                accountId: normalizedAccountId
            },
            take: 20
        })).filter(p => {
            const t = (p.title || '').toUpperCase();
            const b = (p.body || '').trim().toUpperCase();
            const isInvalid = 
                t.includes('LIVE') || 
                t.includes('TESTE') || 
                t.includes('AD:') ||
                b.length < 15 ||
                (t.length < 5 && b.length < 25) ||
                b.includes('CONTEÚDO_TESTE');
            
            if (isInvalid) {
                console.log(`[orchestrator|${normalizedAccountId}] 🛡️ Filtro de segurança Estágio 3 removeu: "${p.title}"`);
                // Marcar como SKIPPED para não tentar de novo
                prisma.post.update({ where: { id: p.id }, data: { status: PostStatus.FAILED } }).catch(() => {});
                return false;
            }
            return true;
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
                    const igPublisher = new InstagramPublisher(targetAccount.accessToken, targetAccount.userId);
                    const carouselData = [];
                    const composedSlideItems: { imageUrl: string; postId: string }[] = [];
                    for (const c of allPendingToPublish) {
                        const isOriginal = (c.metadata as any)?.postOriginal === true;
                        const originalUsername = (c.metadata as any)?.originalUsername;
                        const mediaType = (c.metadata as any)?.mediaType;
                        const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS' || c.imageUrl?.includes('.mp4') || c.imageUrl?.includes('video');

                        // --- CHANNEL ISOLATION CHECK (per post/target) ---
                        const targetChannels = (c.metadata as any)?.targetChannels;
                        const isFeedRequested = !targetChannels || targetChannels.feed !== false;
                        const isReelsRequested = !targetChannels || targetChannels.reels !== false;

                        const targetChannel = isVideo ? Channel.INSTAGRAM_REELS : Channel.INSTAGRAM_FEED;
                        const isChannelRequested = isVideo ? isReelsRequested : isFeedRequested;

                        if (!isChannelRequested) {
                            console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando ${targetChannel} para post ${c.id} (canal desabilitado para este alvo).`);
                            continue;
                        }

                        // --- DE-DUPLICATION CHECK ---
                        if (await isAlreadyPublished(c.id, c.originalUrl, targetChannel)) {
                            console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando ${targetChannel} para post ${c.id} (já publicado anteriormente).`);
                            continue;
                        }

                        if (isOriginal && (isReelsEnabled || isFeedEnabled)) {
                            let caption = originalUsername ? `Créditos: @${originalUsername}\n\n${c.body}` : c.body;

                            if (isVideo) {
                                if (isReelsEnabled) {
                                    console.log(`[orchestrator|${normalizedAccountId}] Publicando Reels original de @${originalUsername}`);

                                    let videoToPublish = c.imageUrl;
                                    let tempFile = '';

                                    const rehostResult = await rehostVideo(c.imageUrl!);
                                    videoToPublish = rehostResult.publicUrl;
                                    tempFile = rehostResult.filename;

                                    const collaborators = originalUsername ? [originalUsername] : undefined;
                                    const result = await igPublisher.publishVideo(videoToPublish!, caption, originalUsername, collaborators);

                                    if (tempFile) {
                                        await deleteHostedFile(tempFile);
                                    }

                                    if (result?.postId) {
                                        await prisma.socialPublication.create({
                                            data: {
                                                postId: c.id,
                                                channel: Channel.INSTAGRAM_REELS,
                                                accountId: normalizedAccountId,
                                                externalId: result.postId,
                                                status: 'SUCCESS'
                                            }
                                        });
                                        await prisma.post.update({
                                            where: { id: c.id },
                                            data: { status: PostStatus.PUBLISHED }
                                        });
                                        postsPublished++;
                                        console.log(`[orchestrator|${normalizedAccountId}] ✅ Reels original publicado e registrado.`);
                                    } else {
                                        console.log(`[orchestrator|${normalizedAccountId}] ⚠️ Falha ao obter postId para Reels original de @${originalUsername}.`);
                                    }
                                } else if (isFeedEnabled && c.imageUrl) {
                                    console.log(`[orchestrator|${normalizedAccountId}] Publicando vídeo no Feed original de @${originalUsername}`);
                                    const rehostResult = await rehostVideo(c.imageUrl);
                                    const collaborators = originalUsername ? [originalUsername] : undefined;
                                    const result = await igPublisher.publishVideo(rehostResult.publicUrl, caption, originalUsername, collaborators);

                                    if (rehostResult.filename) {
                                        await deleteHostedFile(rehostResult.filename);
                                    }

                                    if (result?.postId) {
                                        await prisma.socialPublication.create({
                                            data: {
                                                postId: c.id,
                                                channel: Channel.INSTAGRAM_FEED,
                                                accountId: normalizedAccountId,
                                                externalId: result.postId,
                                                status: 'SUCCESS'
                                            }
                                        });
                                        await prisma.post.update({
                                            where: { id: c.id },
                                            data: { status: PostStatus.PUBLISHED }
                                        });
                                        postsPublished++;
                                        console.log(`[orchestrator|${normalizedAccountId}] ✅ Vídeo no Feed original publicado e registrado.`);
                                    } else {
                                        console.log(`[orchestrator|${normalizedAccountId}] ⚠️ Falha ao obter postId para vídeo no Feed original de @${originalUsername}.`);
                                    }
                                }
                            } else if (isFeedEnabled && c.imageUrl) {
                                console.log(`[orchestrator|${normalizedAccountId}] Re-hospedando imagem de @${originalUsername} para o Feed`);
                                const rehosted = await rehostImage(c.imageUrl, 'ig-original');
                                const collaborators = originalUsername ? [originalUsername] : undefined;
                                const result = await igPublisher.publishFeed(rehosted, caption, originalUsername, collaborators);
                                if (result?.postId) {
                                    await prisma.socialPublication.create({
                                        data: {
                                            postId: c.id,
                                            channel: Channel.INSTAGRAM_FEED,
                                            accountId: normalizedAccountId,
                                            externalId: result.postId,
                                            status: 'SUCCESS'
                                        }
                                    });
                                    await prisma.post.update({
                                        where: { id: c.id },
                                        data: { status: PostStatus.PUBLISHED }
                                    });
                                    postsPublished++;
                                    console.log(`[orchestrator|${normalizedAccountId}] ✅ Imagem Feed original publicada.`);
                                }
                            } else {
                                console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Post original @${originalUsername} pulado (MediaType: ${mediaType}, ReelsEnabled: ${isReelsEnabled}, FeedEnabled: ${isFeedEnabled})`);
                            }

                            await sleep(2000);

                        } else if (!isOriginal && isFeedEnabled) {
                            carouselData.push({
                                postId: c.id,
                                imageUrl: c.imageUrl || undefined,
                                title: c.title,
                                summary: c.body,
                                originalUrl: c.originalUrl,
                                postOriginal: (c.metadata as any)?.postOriginal === true,
                                metadata: c.metadata
                            });
                        }
                    }

                    // Publicar Carrossel se houver itens compostos (somente Feed)
                    if (isFeedEnabled && carouselData.length > 0) {
                        for (let i = 0; i < carouselData.length; i++) {
                            const c = carouselData[i];
                            // --- CHANNEL ISOLATION CHECK for composed items ---
                            const tChannels = (c.metadata as any)?.targetChannels;
                            if (tChannels && tChannels.feed === false) {
                                console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando Feed para post ${c.postId} (canal desabilitado para este alvo).`);
                                continue;
                            }

                            // --- DE-DUPLICATION CHECK for composed items ---
                            if (await isAlreadyPublished(c.postId, c.originalUrl, Channel.INSTAGRAM_FEED)) {
                                console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando Feed para post ${c.postId} (já publicado anteriormente como parte de carrossel).`);
                                continue;
                            }
                            console.log(`[orchestrator|${normalizedAccountId}] Compondo slide ${i + 1} para Carrossel: ${c.title}`);
                            const composed = await composeSlideImage(
                                c.imageUrl,
                                c.title,
                                c.summary,
                                i,
                                fLayout || { fontColor: configMap['primaryColor'] || '#ffffff' }
                            );
                            composedSlideItems.push({ imageUrl: composed.publicUrl, postId: c.postId });
                        }

                        if (composedSlideItems.length > 0) {
                            try {
                                const globalCaption = batchResult?.globalCaption || 'Confira as novidades do dia!';

                                if (composedSlideItems.length === 1) {
                                    const pubResult = await igPublisher.publishFeed(composedSlideItems[0].imageUrl, globalCaption);
                                    if (pubResult?.postId) {
                                        await prisma.socialPublication.create({
                                            data: { postId: composedSlideItems[0].postId, channel: Channel.INSTAGRAM_FEED, accountId: normalizedAccountId, externalId: pubResult.postId, status: 'SUCCESS' }
                                        });
                                        await prisma.post.update({ where: { id: composedSlideItems[0].postId }, data: { status: PostStatus.PUBLISHED } });
                                        postsPublished++;
                                    }
                                } else {
                                    const pubResult = await igPublisher.publishCarousel(
                                        composedSlideItems.map(item => ({ imageUrl: item.imageUrl })),
                                        globalCaption
                                    );
                                    if (pubResult?.postId) {
                                        for (const item of composedSlideItems) {
                                            await prisma.socialPublication.create({
                                                data: { postId: item.postId, channel: Channel.INSTAGRAM_FEED, accountId: normalizedAccountId, externalId: pubResult.postId, status: 'SUCCESS' }
                                            });
                                            await prisma.post.update({ where: { id: item.postId }, data: { status: PostStatus.PUBLISHED } });
                                        }
                                        postsPublished++;
                                    }
                                }
                                console.log(`[orchestrator|${normalizedAccountId}] ✅ Carrossel Instagram publicado.`);
                            } catch (carouselErr) {
                                console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro ao publicar Carrossel Instagram:`, (carouselErr as Error).message);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro fatal processando Instagram Feed/Reels:`, (err as Error).message);
                }
            } else {
                console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando Instagram Feed/Reels (canais desativados)`);
            }


            // 1b. Instagram Story — formato 9:16 vertical
            if (isStoryEnabled) {
                console.log(`[orchestrator|${normalizedAccountId}] 📱 Publicando Stories no Instagram (${allPendingToPublish.length} itens)...`);
                try {
                    const igPublisher = new InstagramPublisher(targetAccount.accessToken, targetAccount.userId);

                    // Seleção diversa: pegar até X Reels originais e até Y News analisadas
                    // RESPEITANDO targetChannels
                    const availableOriginals = allPendingToPublish.filter(p => {
                        const isOriginal = (p.metadata as any)?.postOriginal === true;
                        if (!isOriginal) return false;
                        const targetChannels = (p.metadata as any)?.targetChannels;
                        return !targetChannels || targetChannels.story !== false;
                    });
                    const availableNews = allPendingToPublish.filter(p => {
                        const isOriginal = (p.metadata as any)?.postOriginal === true;
                        if (isOriginal) return false;
                        const targetChannels = (p.metadata as any)?.targetChannels;
                        return !targetChannels || targetChannels.story !== false;
                    });

                    console.log(`[orchestrator|${normalizedAccountId}] Stories permitidos: ${availableOriginals.length} originais, ${availableNews.length} notícias.`);

                    // Se Feed/Reels estiverem desativados, permitimos mais notícias (até 6)
                    const newsLimit = (!isFeedEnabled && !isReelsEnabled) ? 6 : 3;
                    const storyItems = [...availableOriginals.slice(0, 3), ...availableNews.slice(0, newsLimit)];
                    console.log(`[orchestrator|${normalizedAccountId}] Itens selecionados para Stories: ${storyItems.length} (News Limit: ${newsLimit})`);

                    for (let i = 0; i < storyItems.length; i++) {
                        const item = storyItems[i];
                        try {
                            const isOriginal = (item.metadata as any)?.postOriginal === true;
                            const isVideo = item.imageUrl?.includes('.mp4') || (item.metadata as any)?.isReels === true || (item.metadata as any)?.mediaType === 'VIDEO';

                            // --- DE-DUPLICATION CHECK ---
                            if (await isAlreadyPublished(item.id, item.originalUrl, Channel.INSTAGRAM_STORY)) {
                                console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando Story para post ${item.id} (já publicado anteriormente).`);
                                continue;
                            }

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
                                        sLayout || { fontColor: configMap['primaryColor'] || '#ffffff' }
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
            let allowedWhatsappPosts = allPendingToPublish.filter(p => {
                const targetChannels = (p.metadata as any)?.targetChannels;
                return !targetChannels || targetChannels.whatsapp !== false;
            });

            // De-duplication for WhatsApp
            const finalWhatsappPosts = [];
            for (const p of allowedWhatsappPosts) {
                if (!(await isAlreadyPublished(p.id, p.originalUrl, Channel.WHATSAPP))) {
                    finalWhatsappPosts.push(p);
                }
            }
            allowedWhatsappPosts = finalWhatsappPosts;

            if (isWhatsappEnabled && allowedWhatsappPosts.length > 0) {
                console.log(`[orchestrator|${normalizedAccountId}] Enviando para WhatsApp (${allowedWhatsappPosts.length} posts permitidos)...`);
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

            // 3. YouTube Shorts - Viral Video
            if (isYoutubeEnabled) {
                console.log(`[orchestrator|${normalizedAccountId}] 📺 YouTube Shorts ativado. Preparando vídeos virais...`);
                try {
                    // Selecionar posts para YouTube: tanto notícias (analisadas) quanto originais (se forem vídeo)
                    // RESPEITANDO targetChannels
                    const youtubeCandidates = allPendingToPublish.filter(p => {
                        const targetChannels = (p.metadata as any)?.targetChannels;
                        if (targetChannels && targetChannels.shorts === false) return false;

                        const isOriginal = (p.metadata as any)?.postOriginal === true;
                        const isVideo = p.imageUrl?.includes('.mp4') || p.imageUrl?.includes('video') || (p.metadata as any)?.mediaType === 'VIDEO';
                        
                        // Queremos postar originais se forem vídeo, ou notícias analisadas (que usarão fallback se não tiverem vídeo)
                        return isOriginal ? isVideo : true;
                    });
                    
                    if (youtubeCandidates.length > 0) {
                        const cappedYoutube = youtubeCandidates.slice(0, 2); // Limite de 2 por run
                        console.log(`[orchestrator|${normalizedAccountId}] Processando ${cappedYoutube.length} Shorts...`);
                        
                        for (const p of cappedYoutube) {
                            try {
                                // --- DE-DUPLICATION CHECK ---
                                if (await isAlreadyPublished(p.id, p.originalUrl, Channel.YOUTUBE_SHORTS)) {
                                    console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando YouTube Shorts para post ${p.id} (já publicado anteriormente).`);
                                    continue;
                                }

                                const isOriginal = (p.metadata as any)?.postOriginal === true;
                                const analyzed: any = {
                                    title: p.title,
                                    body: p.body,
                                    summary: p.body,
                                    hashtags: p.hashtags || [],
                                    whatsapp: p.body,
                                    instagram: { feed: p.body, story: p.body },
                                    linkedin: p.body,
                                    imageUrl: p.imageUrl,
                                    postOriginal: isOriginal,
                                    sourceName: p.sourceName
                                };
                                
                                await publisherAgent.publishYoutubeShort(p.id, analyzed, normalizedAccountId);
                                postsPublished++;
                                console.log(`[orchestrator|${normalizedAccountId}] ✅ YouTube Short publicado para: ${p.title}`);
                            } catch (itemErr: any) {
                                console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro ao publicar Short para ${p.id}:`, itemErr.message);
                            }
                        }
                    } else {
                        console.log(`[orchestrator|${normalizedAccountId}] Nenhuma mídia adequada para converter em Short.`);
                    }
                } catch (ytErr: any) {
                    console.error(`[orchestrator|${normalizedAccountId}] ❌ Erro crítico no bloco YouTube:`, ytErr.message);
                }
            } else {
                console.log(`[orchestrator|${normalizedAccountId}] ⏭️ Pulando YouTube Shorts (CHANNEL_YOUTUBE_SHORTS: ${configMap['CHANNEL_YOUTUBE_SHORTS']})`);
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
