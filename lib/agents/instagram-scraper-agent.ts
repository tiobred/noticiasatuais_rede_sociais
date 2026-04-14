import { InstagramPublisher } from '../social/instagram';

export class InstagramScraperAgent {
    constructor() { }

    async run(accountId: string, targets: any[], instagramTokens: any[]): Promise<any[]> {
        const resultItems: any[] = [];
        try {
            console.log(`[InstagramScraperAgent] Iniciando scraping para accountId: ${accountId} com ${targets?.length || 0} alvos.`);
            if (!targets || targets.length === 0) {
                console.log('[InstagramScraperAgent] Nenhum alvo configurado para Instagram.');
                return [];
            }

            const tokenInfo = instagramTokens.find(t => t.id.toLowerCase() === accountId.toLowerCase());

            if (!tokenInfo || !tokenInfo.accessToken || !tokenInfo.userId) {
                console.warn(`[InstagramScraperAgent] Tokens de Instagram não encontrados no ambiente ou não associados para accountId: ${accountId}. Pulando.`);
                return [];
            }

            const publisher = new InstagramPublisher(tokenInfo.accessToken, tokenInfo.userId);

            for (const target of targets) {
                const username = target.username;
                const minLikes = target.minLikes ?? 0;
                const minComments = target.minComments ?? 0;
                // Se enabled não estiver definido explicitamente como false, o alvo está habilitado
                const isEnabled = target.enabled !== false;

                if (!username) continue;

                if (!isEnabled) {
                    console.log(`[InstagramScraperAgent] @${username} está DESABILITADO (enabled=false). Pulando.`);
                    continue;
                }

                try {
                    console.log(`[InstagramScraperAgent] Verificando alvo @${username} (minLikes=${minLikes}, minComments=${minComments})...`);
                    const posts = await publisher.getBusinessDiscovery(username, 10);

                    let passedFilter = 0;
                    let failedLikes = 0;
                    let failedComments = 0;

                    for (const post of posts) {
                        const likes = post.like_count || 0;
                        const comments = post.comments_count || 0;

                        if (likes < minLikes) {
                            failedLikes++;
                            continue;
                        }
                        if (comments < minComments) {
                            failedComments++;
                            continue;
                        }

                        passedFilter++;
                        const sourceId = `${accountId}_ig_${post.id}`;
                        const title = `Post do @${username}`;
                        const content = post.caption || '';
                        const link = post.permalink || '';
                        let mediaUrl = post.media_url;
                        let mediaType = post.media_type;

                        if (post.media_type === 'CAROUSEL_ALBUM' && post.children?.data?.length > 0) {
                            const videoItem = post.children.data.find((child: any) => child.media_type === 'VIDEO');
                            if (videoItem) {
                                mediaUrl = videoItem.media_url;
                                mediaType = 'VIDEO';
                            } else {
                                mediaUrl = post.children.data[0].media_url;
                            }
                        }

                        console.log(`[InstagramScraperAgent] ✅ Post elegível @${username}: ${link} (${likes} likes, ${comments} comentários, Tipo: ${mediaType})`);
                        resultItems.push({
                            sourceId,
                            title,
                            body: content,
                            imageUrl: mediaUrl || '',
                            originalUrl: link,
                            sourceName: `Instagram - @${username}`,
                            tags: ['instagram', username],
                            rawContent: JSON.stringify(post),
                            postOriginal: target.postOriginal === true,
                            metadata: {
                                mediaType: mediaType,
                                originalUsername: username,
                                targetChannels: target.channels
                            }
                        });
                    }

                    console.log(`[InstagramScraperAgent] @${username}: ${posts.length} posts verificados → ${passedFilter} elegíveis, ${failedLikes} rejeitados por likes (<${minLikes}), ${failedComments} rejeitados por comentários (<${minComments})`);

                } catch (error) {
                    console.error(`[InstagramScraperAgent] Erro processando alvo @${username}:`, error);
                }
            }

            console.log(`[InstagramScraperAgent] Scraping concluído. ${resultItems.length} posts elegíveis encontrados no total.`);
            return resultItems;

        } catch (error) {
            console.error('[InstagramScraperAgent] Erro geral:', error);
            return [];
        }
    }
}
