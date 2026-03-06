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
    constructor(private accessToken: string, private userId: string) { }

    /**
     * Publica imagem no feed do Instagram
     */
    async publishFeed(imageUrl: string, caption: string): Promise<IGPublishResult> {
        console.log('[instagram] Publicando no feed...');

        // 1. Criar container de mídia
        const { data: container } = await axios.post(
            `${IG_BASE}/${this.userId}/media`,
            null,
            {
                params: {
                    image_url: imageUrl,
                    caption,
                    access_token: this.accessToken,
                },
            }
        );

        if (!container.id) throw new Error('[instagram] Falha ao criar container de mídia');

        // Aguarda processamento
        await this.waitForContainer(container.id);

        // 2. Publicar o container
        const { data: pub } = await axios.post(
            `${IG_BASE}/${this.userId}/media_publish`,
            null,
            {
                params: {
                    creation_id: container.id,
                    access_token: this.accessToken,
                },
            }
        );

        console.log(`[instagram] ✅ Feed publicado: ${pub.id}`);
        return { postId: pub.id, type: 'feed' };
    }

    /**
     * Publica carrossel (álbum) no feed do Instagram
     */
    async publishCarousel(items: { imageUrl: string }[], caption: string): Promise<IGPublishResult> {
        console.log(`[instagram] Criando carrossel com ${items.length} itens...`);

        // 1. Criar containers individuais para cada item
        const containerIds: string[] = [];
        for (const item of items) {
            const { data: container } = await axios.post(
                `${IG_BASE}/${this.userId}/media`,
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
        const { data: albumContainer } = await axios.post(
            `${IG_BASE}/${this.userId}/media`,
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
        const { data: pub } = await axios.post(
            `${IG_BASE}/${this.userId}/media_publish`,
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
    }

    /**
     * Publica imagem nos stories do Instagram
     */
    async publishStory(imageUrl: string): Promise<IGPublishResult> {
        console.log('[instagram] Publicando no story...');

        const { data: container } = await axios.post(
            `${IG_BASE}/${this.userId}/media`,
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

        const { data: pub } = await axios.post(
            `${IG_BASE}/${this.userId}/media_publish`,
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
    }

    /**
     * Aguarda o processamento do container (polling)
     */
    private async waitForContainer(containerId: string, maxWaitMs = 30_000): Promise<void> {
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            const { data } = await axios.get(`${IG_BASE}/${containerId}`, {
                params: { fields: 'status_code', access_token: this.accessToken },
            });
            if (data.status_code === 'FINISHED') return;
            if (data.status_code === 'ERROR') throw new Error('[instagram] Erro no processamento do container');
            await new Promise(r => setTimeout(r, 2000));
        }
        throw new Error('[instagram] Timeout aguardando container');
    }
}
