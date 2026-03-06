import axios from 'axios';

const LI_BASE = 'https://api.linkedin.com/v2';
const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN!;
const PERSON_ID = process.env.LINKEDIN_PERSON_ID!; // ex: urn:li:person:xxxxxxxxxx

export interface LinkedInPublishResult {
    postId: string;
}

/**
 * LinkedIn Publisher — publica posts com imagem via LinkedIn API v2
 */
export class LinkedInPublisher {

    /**
     * Publica um post no LinkedIn com imagem e texto
     */
    async publishPost(text: string, imageUrl?: string): Promise<LinkedInPublishResult> {
        console.log('[linkedin] Publicando post...');

        const headers = {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
        };

        let shareMediaCategory = 'NONE';
        let media: object[] = [];

        if (imageUrl) {
            // Registrar imagem
            const registeredUrl = await this.registerImage();
            await this.uploadImage(registeredUrl.uploadUrl, imageUrl);
            shareMediaCategory = 'IMAGE';
            media = [{
                status: 'READY',
                media: registeredUrl.asset,
            }];
        }

        const postBody: object = {
            author: PERSON_ID,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text,
                    },
                    shareMediaCategory,
                    media,
                },
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
        };

        const { data } = await axios.post(`${LI_BASE}/ugcPosts`, postBody, { headers });

        console.log(`[linkedin] ✅ Post publicado: ${data.id}`);
        return { postId: data.id };
    }

    /**
     * Registra upload de imagem no LinkedIn
     */
    private async registerImage(): Promise<{ uploadUrl: string; asset: string }> {
        const headers = {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        };

        const body = {
            registerUploadRequest: {
                recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                owner: PERSON_ID,
                serviceRelationships: [{
                    relationshipType: 'OWNER',
                    identifier: 'urn:li:userGeneratedContent',
                }],
            },
        };

        const { data } = await axios.post(`${LI_BASE}/assets?action=registerUpload`, body, { headers });

        return {
            uploadUrl: data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
            asset: data.value.asset,
        };
    }

    /**
     * Faz upload da imagem via URL remota
     */
    private async uploadImage(uploadUrl: string, imageUrl: string): Promise<void> {
        // Baixa a imagem e faz upload para o LinkedIn
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        await axios.put(uploadUrl, imageResponse.data, {
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'image/jpeg',
            },
        });
    }
}
