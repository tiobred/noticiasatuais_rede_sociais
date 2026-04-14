import 'dotenv/config';
import { PrismaClient, PostStatus } from '@prisma/client';
import { composeOriginalStoryImage } from '../lib/social/image-composer';
import { InstagramPublisher } from '../lib/social/instagram';

const prisma = new PrismaClient();

/**
 * Script de teste: tenta publicar UM story para a conta promo e mostra o erro exato
 */
async function main() {
    const accounts = JSON.parse(process.env.INSTAGRAM_ACCOUNTS || '[]');
    
    // Testar conta promo
    const promoAcc = accounts.find((a: any) => a.id.toLowerCase() === 'promo');
    if (!promoAcc) {
        console.error('❌ Conta promo não encontrada!');
        return;
    }
    
    console.log(`\n=== Testando publicação de story para: ${promoAcc.name} ===`);
    
    // Buscar 1 post processado com story ativo
    const post = await prisma.post.findFirst({
        where: {
            accountId: 'promo',
            status: PostStatus.PROCESSED,
            metadata: { path: ['postOriginal'], equals: true }
        },
        orderBy: { createdAt: 'asc' }
    });
    
    if (!post) {
        console.error('❌ Nenhum post PROCESSED encontrado para promo');
        return;
    }
    
    console.log(`\nPost selecionado: ${post.id}`);
    console.log(`  Title: ${post.title}`);
    console.log(`  ImageUrl: ${post.imageUrl?.slice(0, 100)}`);
    console.log(`  Metadata: ${JSON.stringify(post.metadata)}`);
    
    // Tentar acessar a URL da imagem
    console.log('\n1. Testando acesso à URL da imagem...');
    try {
        const { default: axios } = await import('axios');
        const resp = await axios.head(post.imageUrl!, { timeout: 10000 });
        console.log(`   HTTP Status: ${resp.status} | Content-Type: ${resp.headers['content-type']}`);
    } catch (e: any) {
        console.error(`   ❌ ERRO ao acessar URL: ${e.message}`);
        if (e.response?.status === 403 || e.response?.status === 401) {
            console.error('   ⚠️ URL EXPIRADA ou com autenticação! Este é o problema!');
        }
    }
    
    // Tentar compor story
    console.log('\n2. Tentando compor imagem de story...');
    let storyImageUrl: string | null = null;
    try {
        const result = await composeOriginalStoryImage(post.imageUrl!);
        storyImageUrl = result.publicUrl;
        console.log(`   ✅ Story composto: ${storyImageUrl}`);
    } catch (e: any) {
        console.error(`   ❌ ERRO ao compor story: ${e.message}`);
    }
    
    if (!storyImageUrl) {
        console.log('\n❌ Não foi possível compor a imagem. Abortando teste.');
        return;
    }
    
    // Testar a URL composta
    console.log('\n3. Testando URL composta (Supabase)...');
    try {
        const { default: axios } = await import('axios');
        const resp = await axios.head(storyImageUrl, { timeout: 10000 });
        console.log(`   HTTP Status: ${resp.status} | Content-Type: ${resp.headers['content-type']}`);
    } catch (e: any) {
        console.error(`   ❌ ERRO ao acessar URL Supabase: ${e.message}`);
    }
    
    // Tentar publicar (DRY RUN: vamos apenas criar o container mas não publicar)
    console.log('\n4. Testando criação de media container na Meta API...');
    try {
        const { default: axios } = await import('axios');
        const params: any = {
            image_url: storyImageUrl,
            media_type: 'STORIES',
            access_token: promoAcc.accessToken,
        };
        const resp = await axios.post(
            `https://graph.facebook.com/v19.0/${promoAcc.userId}/media`,
            null,
            { params, timeout: 30000 }
        );
        console.log(`   ✅ Container criado! ID: ${resp.data?.id}`);
        console.log(`   (NÃO publicando — apenas teste de container)`);
        
        // Verificar status
        if (resp.data?.id) {
            console.log(`   Verificando status do container...`);
            await new Promise(r => setTimeout(r, 5000));
            const statusResp = await axios.get(
                `https://graph.facebook.com/v19.0/${resp.data.id}`,
                { params: { fields: 'status_code,status', access_token: promoAcc.accessToken }, timeout: 15000 }
            );
            console.log(`   Status: ${statusResp.data?.status_code} - ${statusResp.data?.status || ''}`);
        }
    } catch (e: any) {
        console.error(`   ❌ ERRO ao criar container: ${JSON.stringify(e.response?.data || e.message)}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
