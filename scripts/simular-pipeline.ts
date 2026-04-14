import 'dotenv/config';
import { PrismaClient, PostStatus } from '@prisma/client';
import { getMergedConfigs } from '../lib/db/config-helper';

const prisma = new PrismaClient();

/**
 * Script de simulação: mostra exatamente o que o orchestrator vai fazer
 * sem realmente fazer chamadas de API
 */
async function main() {
    const accounts = JSON.parse(process.env.INSTAGRAM_ACCOUNTS || '[]');
    
    for (const acc of accounts) {
        const accountId = acc.id.toLowerCase();
        console.log(`\n${'='.repeat(60)}`);
        console.log(`SIMULAÇÃO PIPELINE: ${accountId}`);
        console.log('='.repeat(60));
        
        const configKeys = [
            'isActive', 'SCRAPER_LIMIT_PER_SOURCE', 'DATA_SOURCES', 'THEMES', 'IG_MONITOR_TARGETS',
            'CHANNEL_INSTAGRAM_FEED', 'CHANNEL_INSTAGRAM_STORY', 'CHANNEL_INSTAGRAM_REELS',
            'CHANNEL_WHATSAPP', 'CHANNEL_YOUTUBE_SHORTS', 'PUBLISH_NEWS_ENABLED', 'PUBLISH_ORIGINALS_ENABLED'
        ];
        
        const configMap = await getMergedConfigs(accountId, configKeys);
        
        const isFeedEnabled = configMap['CHANNEL_INSTAGRAM_FEED'] === true || configMap['CHANNEL_INSTAGRAM_FEED'] === 'true';
        const isStoryEnabled = configMap['CHANNEL_INSTAGRAM_STORY'] === true || configMap['CHANNEL_INSTAGRAM_STORY'] === 'true';
        const isReelsEnabled = configMap['CHANNEL_INSTAGRAM_REELS'] === true || configMap['CHANNEL_INSTAGRAM_REELS'] === 'true';
        const isYoutubeEnabled = configMap['CHANNEL_YOUTUBE_SHORTS'] === true || configMap['CHANNEL_YOUTUBE_SHORTS'] === 'true';
        const isWhatsappEnabled = configMap['CHANNEL_WHATSAPP'] === true || configMap['CHANNEL_WHATSAPP'] === 'true';
        
        const publishNewsEnabled = configMap['PUBLISH_NEWS_ENABLED'] !== false && configMap['PUBLISH_NEWS_ENABLED'] !== 'false';
        const publishOriginalsEnabled = configMap['PUBLISH_ORIGINALS_ENABLED'] !== false && configMap['PUBLISH_ORIGINALS_ENABLED'] !== 'false';
        
        console.log(`\nCanais ativos:`);
        console.log(`  Feed: ${isFeedEnabled} | Story: ${isStoryEnabled} | Reels: ${isReelsEnabled} | YT: ${isYoutubeEnabled} | WA: ${isWhatsappEnabled}`);
        console.log(`Conteúdo habilitado:`);
        console.log(`  Notícias: ${publishNewsEnabled} | Originais: ${publishOriginalsEnabled}`);
        
        if (!isFeedEnabled && !isStoryEnabled && !isReelsEnabled && !isWhatsappEnabled && !isYoutubeEnabled) {
            console.log(`\n❌ CANCELARIA: Nenhum canal ativo`);
            continue;
        }
        
        if (!publishNewsEnabled && !publishOriginalsEnabled) {
            console.log(`\n❌ CANCELARIA: Nem notícias nem originais habilitados`);
            continue;
        }
        
        // Buscar posts PROCESSED
        const processedPosts = await prisma.post.findMany({
            where: { accountId, status: PostStatus.PROCESSED },
            orderBy: { createdAt: 'asc' },
            take: 20
        });
        
        console.log(`\nPosts com status PROCESSED: ${processedPosts.length}`);
        
        // Filtrar por tipo
        const postsToPublish = processedPosts.filter(p => {
            const isOriginal = (p.metadata as any)?.postOriginal === true;
            if (isOriginal && !publishOriginalsEnabled) return false;
            if (!isOriginal && !publishNewsEnabled) return false;
            return true;
        });
        
        console.log(`Posts que passam no filtro tipo: ${postsToPublish.length}`);
        
        // Verificar o que vai publicar em cada canal
        if (isStoryEnabled) {
            const availableOriginals = postsToPublish.filter(p => {
                const isOriginal = (p.metadata as any)?.postOriginal === true;
                if (!isOriginal) return false;
                const targetChannels = (p.metadata as any)?.targetChannels;
                return !targetChannels || targetChannels.story !== false;
            });
            const availableNews = postsToPublish.filter(p => {
                const isOriginal = (p.metadata as any)?.postOriginal === true;
                if (isOriginal) return false;
                const targetChannels = (p.metadata as any)?.targetChannels;
                return !targetChannels || targetChannels.story !== false;
            });
            const newsLimit = (!isFeedEnabled && !isReelsEnabled) ? 6 : 3;
            const storyItems = [...availableOriginals.slice(0, 3), ...availableNews.slice(0, newsLimit)];
            
            console.log(`\n📱 STORY (${storyItems.length} itens):`);
            for (const item of storyItems) {
                const isOriginal = (p => (p.metadata as any)?.postOriginal === true)(item);
                const alreadyPub = await prisma.socialPublication.findFirst({
                    where: { postId: item.id, channel: 'INSTAGRAM_STORY' as any, status: 'SUCCESS', accountId }
                });
                console.log(`  [${isOriginal ? 'original' : 'news'}] "${item.title?.slice(0, 40)}" | já publicado: ${!!alreadyPub}`);
            }
        }
        
        if (isFeedEnabled || isReelsEnabled) {
            const originals = postsToPublish.filter(p => (p.metadata as any)?.postOriginal === true);
            console.log(`\n📷 FEED/REELS (${originals.length} originais para processar):`);
            for (const item of originals) {
                const targetChannels = (item.metadata as any)?.targetChannels;
                const mediaType = (item.metadata as any)?.mediaType;
                const isVideo = item.imageUrl?.includes('.mp4') || mediaType === 'VIDEO' || mediaType === 'REELS';
                console.log(`  [${isVideo ? 'video' : 'image'}] "${item.title?.slice(0, 40)}" | targetChannels: feed=${targetChannels?.feed} reels=${targetChannels?.reels}`);
                console.log(`    imageUrl: ${item.imageUrl?.slice(0, 80) || 'null'}`);
            }
        }
        
        // Verificar instância de run ativa
        const activeRun = await prisma.agentRun.findFirst({
            where: { agentName: `orchestrator_${accountId}`, status: 'RUNNING', startedAt: { gte: new Date(Date.now() - 20 * 60 * 1000) } }
        });
        if (activeRun) {
            console.log(`\n⚠️ BLOQUEADO: Existe um run ativo (id=${activeRun.id}) - pipeline seria abortado por concorrência!`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
