import prisma from '@/lib/db';
import { InstagramPublisher } from '@/lib/social/instagram';
import { LinkedInPublisher } from '@/lib/social/linkedin';
import { WhatsAppPublisher } from '@/lib/social/whatsapp';
import { YouTubePublisher } from '@/lib/social/youtube';
import { VideoComposer } from '@/lib/social/video-composer';
import { composeSlideImage, composeStoryImage } from '@/lib/social/image-composer';
import { withRetry } from '@/lib/utils';
import { AnalyzedPost } from '@/lib/agents/analysis-agent';
import { Channel, PubStatus } from '@prisma/client';
import { getMergedConfigs } from '@/lib/db/config-helper';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * Publisher Agent — publica um post processado em todos os canais configurados
 */
export class PublisherAgent {
    private linkedin = new LinkedInPublisher();
    private whatsapp = new WhatsAppPublisher();
    private youtube = new YouTubePublisher();
    private videoComposer = new VideoComposer();

    private SUPPORT_VIDEOS = [
        "https://www.w3schools.com/html/mov_bbb.mp4",
        "https://vjs.zencdn.net/v/oceans.mp4"
    ];


    async publishAll(
        postId: string,
        analyzed: AnalyzedPost,
        imageUrl?: string,
    ): Promise<{ channel: Channel; success: boolean }[]> {
        const results: { channel: Channel; success: boolean }[] = [];

        const configKeys = [
            'CHANNEL_INSTAGRAM_FEED', 
            'CHANNEL_INSTAGRAM_STORY', 
            'CHANNEL_INSTAGRAM_REELS',
            'CHANNEL_YOUTUBE_SHORTS',
            'CHANNEL_LINKEDIN', 
            'CHANNEL_WHATSAPP', 
            'ACTIVE_INSTAGRAM_ACCOUNTS',
            'STORY_LAYOUT',
            'FEED_LAYOUT'
        ];
        const globalConfigs = await getMergedConfigs('global', configKeys);
        const isEnabledGlobal = (key: string) => globalConfigs[key] === true;

        // Ler contas do env
        const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS;
        let allAccounts: { id: string, name: string, userId: string, accessToken: string }[] = [];
        try {
            allAccounts = allAccountsStr ? JSON.parse(allAccountsStr) : [];
        } catch (e) { console.error("Erro ao fazer parse de INSTAGRAM_ACCOUNTS", e); }

        // Ler contas ativas salvas
        const activeIgAccIds: string[] = Array.isArray(globalConfigs['ACTIVE_INSTAGRAM_ACCOUNTS']) ? (globalConfigs['ACTIVE_INSTAGRAM_ACCOUNTS'] as string[]) : [];

        // Se ativou o feed mas não configurou contas ativas, pode tentar cair num fallback (primeira conta)
        const activeAccountsToUse = activeIgAccIds.length > 0
            ? allAccounts.filter(acc => activeIgAccIds.includes(acc.id))
            : allAccounts.slice(0, 1);

        const tasks: Promise<void>[] = [];

        // Publica em paralelo nos canais habilitados
        if (isEnabledGlobal('CHANNEL_INSTAGRAM_FEED') || isEnabledGlobal('CHANNEL_INSTAGRAM_STORY')) {
            for (const acc of activeAccountsToUse) {
                // Fetch merged configs for THIS specific account
                const accConfigs = await getMergedConfigs(acc.id, configKeys);
                const isEnabledAcc = (key: string) => accConfigs[key] === true;

                const instagram = new InstagramPublisher(acc.accessToken, acc.userId);

                if (isEnabledAcc('CHANNEL_INSTAGRAM_FEED')) {
                    tasks.push(this.publishChannel(postId, Channel.INSTAGRAM_FEED, () =>
                        instagram.publishFeed(imageUrl ?? this.defaultImage(analyzed.title), analyzed.instagram.feed),
                        acc.id
                    ).then(() => { results.push({ channel: Channel.INSTAGRAM_FEED, success: true }); })
                        .catch(() => { results.push({ channel: Channel.INSTAGRAM_FEED, success: false }); }));
                }

                if (isEnabledAcc('CHANNEL_INSTAGRAM_STORY')) {
                    const storyLayout = accConfigs['STORY_LAYOUT'] || globalConfigs['STORY_LAYOUT'];
                    tasks.push(this.publishChannel(postId, Channel.INSTAGRAM_STORY, async () => {
                        console.log(`[publisher] Compondo imagem 9:16 para Story (Account: ${acc.id})...`);
                        const storyComposed = await composeStoryImage(
                            imageUrl,
                            analyzed.title,
                            analyzed.instagram.feed.slice(0, 300), // Usar resumo para o story
                            storyLayout
                        );
                        return instagram.publishStory(storyComposed.publicUrl);
                    }, acc.id).then(() => { results.push({ channel: Channel.INSTAGRAM_STORY, success: true }); })
                        .catch((err) => { 
                            console.error(`[publisher] ❌ Erro ao publicar Story para ${acc.id}:`, err.message);
                            results.push({ channel: Channel.INSTAGRAM_STORY, success: false }); 
                        }));
                }
            }
        }

        if (isEnabledGlobal('CHANNEL_LINKEDIN')) {
            tasks.push(this.publishChannel(postId, Channel.LINKEDIN, () =>
                this.linkedin.publishPost(analyzed.linkedin, imageUrl)
            ).then(() => { results.push({ channel: Channel.LINKEDIN, success: true }); })
                .catch(() => { results.push({ channel: Channel.LINKEDIN, success: false }); }));
        }

        if (isEnabledGlobal('CHANNEL_WHATSAPP')) {
            tasks.push(this.publishChannel(postId, Channel.WHATSAPP, () =>
                imageUrl ? this.whatsapp.sendImage(imageUrl, analyzed.whatsapp) : this.whatsapp.sendText(analyzed.whatsapp)
            ).then(() => { results.push({ channel: Channel.WHATSAPP, success: true }); })
                .catch(() => { results.push({ channel: Channel.WHATSAPP, success: false }); }));
        }

        // YouTube Shorts - Se habilitado em qualquer conta ativa ou global
        let youtubePublished = false;
        for (const acc of activeAccountsToUse) {
            const accConfigs = await getMergedConfigs(acc.id, configKeys);
            if (accConfigs['CHANNEL_YOUTUBE_SHORTS'] === true && !youtubePublished) {
                tasks.push(this.publishYoutubeShort(postId, analyzed, acc.id).then(() => {
                    results.push({ channel: Channel.YOUTUBE_SHORTS, success: true });
                    youtubePublished = true;
                }).catch(err => {
                    console.error(`[publisher] ❌ Erro ao publicar YouTube Shorts para ${acc.id}:`, err.message);
                    results.push({ channel: Channel.YOUTUBE_SHORTS, success: false });
                }));
            }
        }

        await Promise.allSettled(tasks);

        return results;
    }

    async publishYoutubeShort(
        postId: string,
        analyzed: any,
        accountId: string
    ): Promise<void> {
        return this.publishChannel(postId, Channel.YOUTUBE_SHORTS, async () => {
            console.log(`[publisher|${accountId}] 🎬 v2 - Preparando vídeo real para YouTube Shorts...`);
            
            const hasFfmpeg = await this.videoComposer.isFfmpegAvailable();
            if (!hasFfmpeg) {
                throw new Error("FFmpeg não instalado no servidor.");
            }

            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

            const contentVideoPath = path.join(tmpDir, `content_${postId}.mp4`);
            const backgroundVideoPath = path.join(tmpDir, `bg_${postId}.mp4`);
            const outputFileName = `viral_${postId}.mp4`;

            try {
                // 1. Identificar vídeo principal (Viral Original ou Notícia)
                const mainVideoUrl = analyzed.imageUrl && (analyzed.imageUrl.includes('.mp4') || analyzed.imageUrl.includes('video'))
                    ? analyzed.imageUrl 
                    : null;

                if (!mainVideoUrl) {
                    console.log(`[publisher] ⚠️ Nenhum vídeo real encontrado para o post ${postId}. Usando fallback de suporte.`);
                }

                const finalMainVideoUrl = mainVideoUrl || this.SUPPORT_VIDEOS[0];
                await this.downloadFile(finalMainVideoUrl, contentVideoPath);

                // 2. Se for um post original (já é um vídeo viral), podemos publicar direto ou com splitscreen
                // O usuário quer "identificar vídeos virais... retirar partes virais".
                // Se já é viral, vamos apenas garantir o formato e talvez adicionar legenda.
                
                let finalPath: string;

                if (analyzed.postOriginal && mainVideoUrl) {
                    console.log(`[publisher] Usando vídeo original viral de ${analyzed.sourceName || 'Desconhecido'}`);
                    // Apenas garantir que está no formato/duração (createViralSplitscreen já faz o crop/scale)
                    const bgUrl = this.SUPPORT_VIDEOS[1]; // Satisfying video de fundo
                    await this.downloadFile(bgUrl, backgroundVideoPath);
                    
                    finalPath = await this.videoComposer.createViralSplitscreen(
                        contentVideoPath,
                        backgroundVideoPath,
                        outputFileName
                    );
                } else {
                    // Notícia: usa splitscreen com satisfatório
                    const bgUrl = this.SUPPORT_VIDEOS[Math.floor(Math.random() * this.SUPPORT_VIDEOS.length)];
                    await this.downloadFile(bgUrl, backgroundVideoPath);

                    finalPath = await this.videoComposer.createViralSplitscreen(
                        contentVideoPath,
                        backgroundVideoPath,
                        outputFileName
                    );
                }

                // 3. Adicionar Legendas Dinâmicas baseadas na análise da IA
                const captionText = analyzed.title.length > 50 ? analyzed.title.slice(0, 47) + '...' : analyzed.title;
                const captionedPath = await this.videoComposer.addDynamicCaptions(
                    finalPath,
                    captionText,
                    `captioned_${outputFileName}`
                );

                // 4. Publicar no YouTube com #Shorts
                const pubResult = await this.youtube.publishShort(
                    captionedPath,
                    `${analyzed.title} #Shorts`,
                    `${analyzed.whatsapp || analyzed.body || analyzed.summary}\n\n#Shorts #Viral #Noticias`
                );

                // Cleanup
                [contentVideoPath, backgroundVideoPath, finalPath, captionedPath].forEach(p => {
                    if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch(e){}
                });

                return pubResult;
            } catch (err) {
                console.error(`[publisher|${accountId}] ❌ Erro no fluxo YouTube Shorts:`, err);
                [contentVideoPath, backgroundVideoPath].forEach(p => {
                    if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch(e){}
                });
                throw err;
            }
        }, accountId);
    }

    async publishCarousel(
        postIds: string[],
        items: { imageUrl?: string; title: string; summary: string }[],
        mainCaption: string,
        layoutConfig?: any
    ): Promise<{ channel: Channel; success: boolean }[]> {
        const results: { channel: Channel; success: boolean }[] = [];

        // 1. Compor cada slide individualmente com texto embutido
        console.log(`[publisher] Compondo ${items.length} slides com texto individualizado...`);
        const igItems: { imageUrl: string }[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                // Se a imagem já parece ser uma composição (contém 'slide-' e vem do nosso bucket), não compor novamente
                const isAlreadyComposed = items[i].imageUrl?.includes('slide-') && items[i].imageUrl?.includes('.supabase.co');

                if (isAlreadyComposed && items[i].imageUrl) {
                    console.log(`[publisher] Item ${i + 1} já está composto, pulando nova composição.`);
                    igItems.push({ imageUrl: items[i].imageUrl! });
                } else {
                    const composed = await composeSlideImage(
                        items[i].imageUrl,
                        items[i].title,
                        items[i].summary,
                        i,
                        layoutConfig
                    );
                    igItems.push({ imageUrl: composed.publicUrl });
                }
            } catch (composeErr) {
                console.error(`[publisher] ❌ Erro ao compor slide ${i + 1}:`, (composeErr as Error).message);
                // Fallback para placeholder se falhar (raro)
                igItems.push({ imageUrl: this.defaultImage(items[i].title) });
            }
        }

        // 2. Publicar carrossel no Instagram com as imagens compostas
        const firstPostId = postIds[0];

        const configKeys = [
            'CHANNEL_INSTAGRAM_FEED', 
            'CHANNEL_INSTAGRAM_STORY', 
            'CHANNEL_INSTAGRAM_REELS',
            'CHANNEL_YOUTUBE_SHORTS',
            'CHANNEL_LINKEDIN', 
            'CHANNEL_WHATSAPP', 
            'ACTIVE_INSTAGRAM_ACCOUNTS'
        ];
        const globalConfigs = await getMergedConfigs('global', configKeys);
        const activeIgAccIds: string[] = Array.isArray(globalConfigs['ACTIVE_INSTAGRAM_ACCOUNTS']) ? (globalConfigs['ACTIVE_INSTAGRAM_ACCOUNTS'] as string[]) : [];

        const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS;
        let allAccounts: { id: string, name: string, userId: string, accessToken: string }[] = [];
        try {
            allAccounts = allAccountsStr ? JSON.parse(allAccountsStr) : [];
        } catch (e) { }

        const activeAccountsToUse = activeIgAccIds.length > 0
            ? allAccounts.filter(acc => activeIgAccIds.includes(acc.id))
            : allAccounts.slice(0, 1);

        for (const acc of activeAccountsToUse) {
            const accConfigs = await getMergedConfigs(acc.id, configKeys);
            const feedEnabledAcc = accConfigs['CHANNEL_INSTAGRAM_FEED'] === true;

            if (feedEnabledAcc) {
                const instagram = new InstagramPublisher(acc.accessToken, acc.userId);

                await Promise.allSettled([
                    this.publishChannel(firstPostId, Channel.INSTAGRAM_FEED, () =>
                        instagram.publishCarousel(igItems, mainCaption),
                        acc.id
                    ).then(() => results.push({ channel: Channel.INSTAGRAM_FEED, success: true }))
                        .catch(() => results.push({ channel: Channel.INSTAGRAM_FEED, success: false })),
                ]);
            }
        }

        return results;
    }

    /**
     * Publica em um canal com retry e persiste resultado no banco
     */
    public async publishChannel(
        postId: string,
        channel: Channel,
        publishFn: () => Promise<{ postId?: string; messageId?: string }>,
        accountId?: string
    ): Promise<void> {
        // Cria registro pendente
        const pub = await prisma.socialPublication.create({
            data: { postId, channel, status: PubStatus.PENDING, accountId },
        });

        try {
            const result = await withRetry(publishFn, 3, 2000);
            const externalId = result.postId ?? result.messageId;

            await prisma.socialPublication.update({
                where: { id: pub.id },
                data: {
                    status: PubStatus.SUCCESS,
                    externalId,
                    publishedAt: new Date(),
                },
            });
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            await prisma.socialPublication.update({
                where: { id: pub.id },
                data: { status: PubStatus.FAILED, error },
            });
            throw err;
        }
    }

    /**
     * Helper para download de arquivos
     */
    private async downloadFile(url: string, dest: string): Promise<void> {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }

    /**
     * Gera URL de imagem placeholder quando não há imagem original
     */
    private defaultImage(title: string): string {
        // Cores mais premium: Fundo escuro profundo, texto esmeralda vibrante
        const bgColor = '0f172a'; // slate-900
        const textColor = '10b981'; // emerald-500
        const safeTitle = title || 'VERBOSE';
        const encoded = encodeURIComponent(safeTitle.toUpperCase().slice(0, 80));
        return `https://via.placeholder.com/1080x1080/${bgColor}/${textColor}?text=${encoded}`;
    }
}
