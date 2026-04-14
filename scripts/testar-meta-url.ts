import 'dotenv/config';
import { PrismaClient, PostStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
    const accounts = JSON.parse(process.env.INSTAGRAM_ACCOUNTS || '[]');
    const promoAcc = accounts.find((a: any) => a.id.toLowerCase() === 'promo');
    
    if (!promoAcc) {
        console.error('Conta promo não encontrada!');
        return;
    }
    
    const post = await prisma.post.findFirst({
        where: { accountId: 'promo', status: PostStatus.PROCESSED },
        orderBy: { createdAt: 'asc' }
    });
    
    if (!post || !post.imageUrl) {
        console.error('Nenhum post encontrado');
        return;
    }
    
    console.log(`Testando URL: ${post.imageUrl.slice(0, 100)}`);
    
    // Testar se a Meta API aceita a URL direta do CDN Instagram
    try {
        const resp = await axios.post(
            `https://graph.facebook.com/v19.0/${promoAcc.userId}/media`,
            null,
            {
                params: {
                    image_url: post.imageUrl,
                    media_type: 'STORIES',
                    access_token: promoAcc.accessToken,
                },
                timeout: 30000,
            }
        );
        console.log('\n✅ URL do Instagram CDN ACEITA pela Meta API!');
        console.log('Container ID:', resp.data?.id);
        console.log('\nISTO BEDEUTA QUE: podemos publicar stories sem fazer upload para Supabase!');
    } catch (e: any) {
        const errData = e.response?.data?.error;
        console.log('\n❌ Meta API rejeitou a URL do CDN. Erro:');
        console.log(JSON.stringify(errData || e.message, null, 2));
        
        if (errData?.code === 190 || errData?.code === 102) {
            console.log('\n⚠️ Token de acesso inválido ou expirado!');
        } else if (errData?.code === 2207026) {
            console.log('\n⚠️ Limite de publicações atingido (post limit)');
        } else {
            console.log('\nCódigo de erro:', errData?.code, 'Subcode:', errData?.error_subcode);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
