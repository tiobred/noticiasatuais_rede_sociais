import prisma from '@/lib/db';
import { InstagramPublisher } from '@/lib/social/instagram';
import { LinkedInPublisher } from '@/lib/social/linkedin';
import { WhatsAppPublisher } from '@/lib/social/whatsapp';
import { composeSlideImage } from '@/lib/social/image-composer';
import { withRetry } from '@/lib/utils';
import { AnalyzedPost } from '@/lib/agents/analysis-agent';
import { Channel, PubStatus } from '@prisma/client';

/**
 * Publisher Agent — publica um post processado em todos os canais configurados
 */
export class PublisherAgent {
    private linkedin = new LinkedInPublisher();
    private whatsapp = new WhatsAppPublisher();

    async publishAll(
        postId: string,
        analyzed: AnalyzedPost,
        imageUrl?: string,
    ): Promise<{ channel: Channel; success: boolean }[]> {
        const results: { channel: Channel; success: boolean }[] = [];

        const configs = await prisma.systemConfig.findMany({
            where: { key: { in: ['CHANNEL_INSTAGRAM_FEED', 'CHANNEL_INSTAGRAM_STORY', 'CHANNEL_LINKEDIN', 'CHANNEL_WHATSAPP', 'ACTIVE_INSTAGRAM_ACCOUNTS'] } }
        });
        const getConfig = (key: string) => configs.find((c: any) => c.key === key)?.value;
        const isEnabled = (key: string) => getConfig(key) === undefined ? true : getConfig(key) === true;

        // Ler contas do env
        const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS;
        let allAccounts: { id: string, name: string, userId: string, accessToken: string }[] = [];
        try {
            allAccounts = allAccountsStr ? JSON.parse(allAccountsStr) : [];
        } catch (e) { console.error("Erro ao fazer parse de INSTAGRAM_ACCOUNTS", e); }

        // Ler contas ativas salvas
        const activeIgAccIds: string[] = Array.isArray(getConfig('ACTIVE_INSTAGRAM_ACCOUNTS')) ? (getConfig('ACTIVE_INSTAGRAM_ACCOUNTS') as string[]) : [];

        // Se ativou o feed mas não configurou contas ativas, pode tentar cair num fallback (primeira conta)
        // Isso mantem o sistema retro-compatível c/ configs velhas
        const activeAccountsToUse = activeIgAccIds.length > 0
            ? allAccounts.filter(acc => activeIgAccIds.includes(acc.id))
            : allAccounts.slice(0, 1);

        const tasks: Promise<void>[] = [];

        // Publica em paralelo nos canais habilitados
        if (isEnabled('CHANNEL_INSTAGRAM_FEED') || isEnabled('CHANNEL_INSTAGRAM_STORY')) {
            for (const acc of activeAccountsToUse) {
                const instagram = new InstagramPublisher(acc.accessToken, acc.userId);

                if (isEnabled('CHANNEL_INSTAGRAM_FEED')) {
                    tasks.push(this.publishChannel(postId, Channel.INSTAGRAM_FEED, () =>
                        instagram.publishFeed(imageUrl ?? this.defaultImage(analyzed.title), analyzed.instagram.feed),
                        acc.id
                    ).then(() => { results.push({ channel: Channel.INSTAGRAM_FEED, success: true }); })
                        .catch(() => { results.push({ channel: Channel.INSTAGRAM_FEED, success: false }); }));
                }

                if (isEnabled('CHANNEL_INSTAGRAM_STORY')) {
                    tasks.push(this.publishChannel(postId, Channel.INSTAGRAM_STORY, () =>
                        instagram.publishStory(imageUrl ?? this.defaultImage(analyzed.title)),
                        acc.id
                    ).then(() => { results.push({ channel: Channel.INSTAGRAM_STORY, success: true }); })
                        .catch(() => { results.push({ channel: Channel.INSTAGRAM_STORY, success: false }); }));
                }
            }
        }

        if (isEnabled('CHANNEL_LINKEDIN')) {
            tasks.push(this.publishChannel(postId, Channel.LINKEDIN, () =>
                this.linkedin.publishPost(analyzed.linkedin, imageUrl)
            ).then(() => { results.push({ channel: Channel.LINKEDIN, success: true }); })
                .catch(() => { results.push({ channel: Channel.LINKEDIN, success: false }); }));
        }

        if (isEnabled('CHANNEL_WHATSAPP')) {
            tasks.push(this.publishChannel(postId, Channel.WHATSAPP, () =>
                imageUrl ? this.whatsapp.sendImage(imageUrl, analyzed.whatsapp) : this.whatsapp.sendText(analyzed.whatsapp)
            ).then(() => { results.push({ channel: Channel.WHATSAPP, success: true }); })
                .catch(() => { results.push({ channel: Channel.WHATSAPP, success: false }); }));
        }

        await Promise.allSettled(tasks);

        return results;
    }

    async publishCarousel(
        postIds: string[],
        items: { imageUrl?: string; title: string; summary: string }[],
        mainCaption: string,
    ): Promise<{ channel: Channel; success: boolean }[]> {
        const results: { channel: Channel; success: boolean }[] = [];

        // 1. Compor cada slide individualmente com texto embutido
        console.log(`[publisher] Compondo ${items.length} slides com texto individualizado...`);
        const igItems: { imageUrl: string }[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const composed = await composeSlideImage(
                    items[i].imageUrl,   // imagem original da notícia (ou undefined)
                    items[i].title,      // título específico deste slide
                    items[i].summary,    // resumo específico deste slide
                    i
                );
                igItems.push({ imageUrl: composed.publicUrl });
            } catch (composeErr) {
                console.error(`[publisher] ❌ Erro ao compor slide ${i + 1}:`, (composeErr as Error).message);
                // Fallback para placeholder se falhar (raro)
                igItems.push({ imageUrl: this.defaultImage(items[i].title) });
            }
        }

        // 2. Publicar carrossel no Instagram com as imagens compostas
        const firstPostId = postIds[0];

        const feedConfig = await prisma.systemConfig.findUnique({ where: { key: 'CHANNEL_INSTAGRAM_FEED' } });
        const feedEnabled = feedConfig ? feedConfig.value === true : true;

        const activeAccConfig = await prisma.systemConfig.findUnique({ where: { key: 'ACTIVE_INSTAGRAM_ACCOUNTS' } });
        const activeIgAccIds: string[] = Array.isArray(activeAccConfig?.value) ? (activeAccConfig?.value as string[]) : [];

        const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS;
        let allAccounts: { id: string, name: string, userId: string, accessToken: string }[] = [];
        try {
            allAccounts = allAccountsStr ? JSON.parse(allAccountsStr) : [];
        } catch (e) { }

        const activeAccountsToUse = activeIgAccIds.length > 0
            ? allAccounts.filter(acc => activeIgAccIds.includes(acc.id))
            : allAccounts.slice(0, 1);

        if (feedEnabled) {
            for (const acc of activeAccountsToUse) {
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
    private async publishChannel(
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
     * Gera URL de imagem placeholder quando não há imagem original
     */
    private defaultImage(title: string): string {
        // Cores mais premium: Fundo escuro profundo, texto esmeralda vibrante
        const bgColor = '0f172a'; // slate-900
        const textColor = '10b981'; // emerald-500
        const encoded = encodeURIComponent(title.toUpperCase().slice(0, 80));
        return `https://via.placeholder.com/1080x1080/${bgColor}/${textColor}?text=${encoded}`;
    }
}
