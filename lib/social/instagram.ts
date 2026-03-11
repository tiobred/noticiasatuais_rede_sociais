import axios from 'axios';

const IG_BASE = 'https://graph.facebook.com/v19.0';

export interface IGPublishResult {
    postId: string;
    type: 'feed' | 'story';
}

/**
 * Instagram Publisher — publica no feed e stories via Meta Graph API
 */
export class InstagramPublisher {
    private api = axios.create({
        baseURL: IG_BASE,
        timeout: 45000, // 45 segundos de timeout por request
    });

    constructor(private accessToken: string, private userId: string) { }

    /**
     * Publica imagem no feed do Instagram
     */
    async publishFeed(imageUrl: string, caption: string, tagUsername?: string, collaborators?: string[]): Promise<IGPublishResult> {
        console.log('[instagram] Publicando no feed...');

        const attemptPublish = async (tags?: string, collabAccounts?: string[]) => {
            const params: any = {
                image_url: imageUrl,
                caption,
                access_token: this.accessToken,
            };
            if (tags) params.user_tags = tags;
            if (collabAccounts && collabAccounts.length > 0) {
                params.collaborators = JSON.stringify(collabAccounts);
            }

            const { data: container } = await this.api.post(
                `/${this.userId}/media`,
                null,
                { params }
            );

            if (!container.id) throw new Error('[instagram] Falha ao criar container de mídia');
            await this.waitForContainer(container.id);

            const { data: pub } = await this.api.post(
                `/${this.userId}/media_publish`,
                null,
                {
                    params: {
                        creation_id: container.id,
                        access_token: this.accessToken,
                    },
                }
            );
            return pub.id;
        };

        try {
            const userTags = tagUsername ? JSON.stringify([{ username: tagUsername, x: 0.5, y: 0.5 }]) : undefined;
            const postId = await attemptPublish(userTags, collaborators);
            console.log(`[instagram] ✅ Feed publicado: ${postId}`);
            return { postId, type: 'feed' };
        } catch (error: any) {
            const errData = error.response?.data?.error;
            // Se falhou com erro de parâmetro (100) e estávamos tentando usar tags/collab, tenta sem eles
            if ((tagUsername || collaborators) && (errData?.code === 100 || errData?.error_subcode === 2207064)) {
                console.warn('[instagram] ⚠️ Falha nas tags/collaborators, tentando sem eles...');
                try {
                    const postId = await attemptPublish(undefined, undefined);
                    console.log(`[instagram] ✅ Feed publicado (fallback): ${postId}`);
                    return { postId, type: 'feed' };
                } catch (fallbackError: any) {
                    const finalErr = fallbackError.response?.data?.error || fallbackError.message;
                    throw new Error(`[instagram] Erro fatal no feed (após fallback): ${JSON.stringify(finalErr)}`);
                }
            }
            const errDetails = errData || error.message;
            console.error('[instagram] Erro ao publicar feed:', errDetails);
            throw new Error(`[instagram] Erro ao publicar feed: ${JSON.stringify(errDetails)}`);
        }
    }

    /**
     * Publica carrossel (álbum) no feed do Instagram
     */
    async publishCarousel(items: { imageUrl: string }[], caption: string): Promise<IGPublishResult> {
        console.log(`[instagram] Criando carrossel com ${items.length} itens...`);

        try {
            // 1. Criar containers individuais para cada item
            const containerIds: string[] = [];
            for (const item of items) {
                const { data: container } = await this.api.post(
                    `/${this.userId}/media`,
                    null,
                    {
                        params: {
                            image_url: item.imageUrl,
                            is_carousel_item: true,
                            access_token: this.accessToken,
                        },
                    }
                );
                if (!container.id) throw new Error('[instagram] Falha ao criar container de item do carrossel');
                containerIds.push(container.id);
            }

            // 2. Aguardar processamento de todos os containers
            await Promise.all(containerIds.map(id => this.waitForContainer(id)));

            // 3. Criar container do álbum (CAROUSEL)
            const { data: albumContainer } = await this.api.post(
                `/${this.userId}/media`,
                null,
                {
                    params: {
                        media_type: 'CAROUSEL',
                        children: containerIds.join(','),
                        caption,
                        access_token: this.accessToken,
                    },
                }
            );

            if (!albumContainer.id) throw new Error('[instagram] Falha ao criar container do álbum');

            // Aguarda álbum
            await this.waitForContainer(albumContainer.id);

            // 4. Publicar o álbum
            const { data: pub } = await this.api.post(
                `/${this.userId}/media_publish`,
                null,
                {
                    params: {
                        creation_id: albumContainer.id,
                        access_token: this.accessToken,
                    },
                }
            );

            console.log(`[instagram] ✅ Carrossel publicado: ${pub.id}`);
            return { postId: pub.id, type: 'feed' };
        } catch (error: any) {
            const errDetails = error.response?.data?.error || error.message;
            console.error('[instagram] Erro ao publicar carrossel:', errDetails);
            throw new Error(`[instagram] Erro ao publicar carrossel: ${JSON.stringify(errDetails)}`);
        }
    }

    /**
     * Publica vídeo (Reels) no feed do Instagram
     */
    async publishVideo(videoUrl: string, caption: string, tagUsername?: string, collaborators?: string[]): Promise<IGPublishResult> {
        console.log('[instagram] Publicando vídeo (Reels)...');

        const attemptPublish = async (tags?: string, collabAccounts?: string[], shareToFeed = true) => {
            const params: any = {
                video_url: videoUrl,
                media_type: 'REELS',
                caption,
                share_to_feed: shareToFeed,
                access_token: this.accessToken,
            };
            if (tags) params.user_tags = tags;
            if (collabAccounts && collabAccounts.length > 0) {
                params.collaborators = JSON.stringify(collabAccounts);
            }

            const { data: container } = await this.api.post(
                `/${this.userId}/media`,
                null,
                { params }
            );

            if (!container.id) throw new Error('[instagram] Falha ao criar container de vídeo');
            await this.waitForContainer(container.id, 300_000);

            const { data: pub } = await this.api.post(
                `/${this.userId}/media_publish`,
                null,
                {
                    params: {
                        creation_id: container.id,
                        access_token: this.accessToken,
                    },
                }
            );
            return pub.id;
        };

        try {
            const userTags = tagUsername ? JSON.stringify([{ username: tagUsername, x: 0.5, y: 0.5 }]) : undefined;
            const postId = await attemptPublish(userTags, collaborators, true);
            console.log(`[instagram] ✅ Vídeo (Reels) publicado: ${postId}`);
            return { postId, type: 'feed' };
        } catch (error: any) {
            const errData = error.response?.data?.error;
            // Se falhou com erro de parâmetro, tenta sem tags/collab e sem share_to_feed (fallback agressivo)
            if ((tagUsername || collaborators) && (errData?.code === 100 || errData?.error_subcode === 2207064)) {
                console.warn('[instagram] ⚠️ Falha nos parâmetros do Reels, tentando fallback sem tags/collab/feed...');
                try {
                    const postId = await attemptPublish(undefined, undefined, false);
                    console.log(`[instagram] ✅ Vídeo (Reels) publicado (fallback): ${postId}`);
                    return { postId, type: 'feed' };
                } catch (fallbackError: any) {
                    const finalErr = fallbackError.response?.data?.error || fallbackError.message;
                    throw new Error(`[instagram] Erro fatal no Reels (após fallback): ${JSON.stringify(finalErr)}`);
                }
            }
            const errDetails = errData || error.message;
            console.error('[instagram] Erro ao publicar vídeo:', errDetails);
            throw new Error(`[instagram] Erro ao publicar vídeo: ${JSON.stringify(errDetails)}`);
        }
    }

    /**
     * Publica imagem nos stories do Instagram
     */
    async publishStory(imageUrl: string): Promise<IGPublishResult> {
        console.log('[instagram] Publicando no story...');

        try {
            const { data: container } = await this.api.post(
                `/${this.userId}/media`,
                null,
                {
                    params: {
                        image_url: imageUrl,
                        media_type: 'STORIES',
                        access_token: this.accessToken,
                    },
                }
            );

            if (!container.id) throw new Error('[instagram] Falha ao criar story container');

            await this.waitForContainer(container.id);

            const { data: pub } = await this.api.post(
                `/${this.userId}/media_publish`,
                null,
                {
                    params: {
                        creation_id: container.id,
                        access_token: this.accessToken,
                    },
                }
            );

            console.log(`[instagram] ✅ Story publicado: ${pub.id}`);
            return { postId: pub.id, type: 'story' };
        } catch (error: any) {
            const errDetails = error.response?.data?.error || error.message;
            console.error('[instagram] Erro ao publicar story:', errDetails);
            throw new Error(`[instagram] Erro ao publicar story: ${JSON.stringify(errDetails)}`);
        }
    }

    /**
     * Publica vídeo nos stories do Instagram
     */
    async publishStoryVideo(videoUrl: string): Promise<IGPublishResult> {
        console.log('[instagram] Publicando vídeo no story...');

        try {
            const { data: container } = await this.api.post(
                `/${this.userId}/media`,
                null,
                {
                    params: {
                        video_url: videoUrl,
                        media_type: 'STORIES',
                        access_token: this.accessToken,
                    },
                }
            );

            if (!container.id) throw new Error('[instagram] Falha ao criar story(video) container');

            await this.waitForContainer(container.id, 300_000);

            const { data: pub } = await this.api.post(
                `/${this.userId}/media_publish`,
                null,
                {
                    params: {
                        creation_id: container.id,
                        access_token: this.accessToken,
                    },
                }
            );

            console.log(`[instagram] ✅ Story (video) publicado: ${pub.id}`);
            return { postId: pub.id, type: 'story' };
        } catch (error: any) {
            const errDetails = error.response?.data?.error || error.message;
            console.error('[instagram] Erro ao publicar story video:', errDetails);
            throw new Error(`[instagram] Erro ao publicar story video: ${JSON.stringify(errDetails)}`);
        }
    }

    /**
     * Retorna os posts recentes de uma conta alvo usando Business Discovery
     */
    async getBusinessDiscovery(targetUsername: string, limit = 10): Promise<any[]> {
        console.log(`[instagram] Buscando posts de @${targetUsername} via Business Discovery...`);
        try {
            const { data } = await this.api.get(
                `/${this.userId}`,
                {
                    params: {
                        fields: `business_discovery.username(${targetUsername}){media.limit(${limit}){id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,children{id,media_type,media_url}}}`,
                        access_token: this.accessToken,
                    },
                }
            );
            return data.business_discovery?.media?.data || [];
        } catch (error: any) {
            console.error(`[instagram] Erro ao buscar posts de @${targetUsername}:`, error.response?.data?.error || error.message);
            return [];
        }
    }

    /**
     * Aguarda o processamento do container (polling)
     */
    private async waitForContainer(containerId: string, maxWaitMs = 60_000): Promise<void> {
        const start = Date.now();
        console.log(`[instagram] Aguardando processamento do container ${containerId}...`);
        while (Date.now() - start < maxWaitMs) {
            const { data } = await this.api.get(`/${containerId}`, {
                params: { fields: 'status_code,status', access_token: this.accessToken },
            });
            console.log(`[instagram] Container ${containerId} status: ${data.status_code}`);

            if (data.status_code === 'FINISHED') return;
            if (data.status_code === 'ERROR') {
                const errMsg = data.status || 'Erro no processamento do vídeo';
                throw new Error(`[instagram] Erro no processamento do container: ${errMsg}`);
            }
            await new Promise(r => setTimeout(r, 5000)); // Polling a cada 5s
        }
        throw new Error(`[instagram] Timeout aguardando container ${containerId} após ${maxWaitMs / 1000}s`);
    }
}
