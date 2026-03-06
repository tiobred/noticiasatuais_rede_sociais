import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import prisma from '@/lib/db';
import { hashContent } from '@/lib/utils';

export interface RawNewsItem {
    sourceId: string;
    title: string;
    body: string;
    imageUrl?: string;
    originalUrl?: string;
    sourceName: string;
    tags: string[];
    rawContent: string;
}

const FEEDS = [
    { name: 'InfoMoney', url: 'https://www.infomoney.com.br/feed/' },
    { name: 'Exame', url: 'https://exame.com/feed/' },
    { name: 'G1 Economia', url: 'https://g1.globo.com/rss/g1/economia/' }
];

/**
 * Scraper Agent — Coleta notícias de feeds RSS abertos
 */
export class ScraperAgent {
    private parser: Parser;
    private limit: number;

    constructor(limit: number = 2) {
        this.limit = limit;
        this.parser = new Parser({
            customFields: {
                item: ['description', 'content:encoded', 'category']
            }
        });
    }

    async init(): Promise<void> {
        // Inicialização rápida, sem necessidade de browser
        console.log('[scraper] Inicializando RSS parser...');
    }

    async close(): Promise<void> {
        // Nenhum recurso pesado para fechar
        console.log('[scraper] RSS parser finalizado.');
    }

    /**
     * Coleta as notícias dos feeds RSS configurados
     */
    async scrape(): Promise<RawNewsItem[]> {
        const items: RawNewsItem[] = [];

        for (const feedConfig of FEEDS) {
            try {
                console.log(`[scraper] Buscando feed: ${feedConfig.name} (${feedConfig.url})`);
                const feed = await this.parser.parseURL(feedConfig.url);

                // Pegar os itens mais recentes (limite configurável)
                const recentItems = feed.items.slice(0, this.limit);

                for (const item of recentItems) {
                    const title = item.title?.trim() ?? '';
                    const link = item.link?.trim() ?? '';

                    // Conteúdo pode estar em content, content:encoded ou description
                    let htmlContent = item['content:encoded'] || item.content || item.description || '';

                    // Extrai texto limpo e imagem usando cheerio
                    const $ = cheerio.load(htmlContent);
                    const bodyText = $.text().trim();
                    const imageEl = $('img').first();
                    const imageUrl = imageEl.attr('src') ?? undefined;

                    // Ignorar se não tiver conteúdo suficiente (alguns feeds só mandam título)
                    if (!title || bodyText.length < 20) continue;

                    // Categorias / Tags
                    let tags: string[] = [];
                    if (Array.isArray(item.categories)) {
                        tags = item.categories.map(c => typeof c === 'string' ? c : (c as any)._ ?? '').filter(Boolean);
                    } else if (item.categories && typeof item.categories === 'string') {
                        tags = [item.categories];
                    }

                    const sourceContent = `${title}\n${bodyText}`;
                    const sourceId = hashContent(sourceContent);

                    items.push({
                        sourceId,
                        title,
                        body: bodyText,
                        imageUrl,
                        originalUrl: link,
                        sourceName: feedConfig.name,
                        tags,
                        rawContent: sourceContent
                    });
                }
                console.log(`[scraper] ${recentItems.length} itens processados de ${feedConfig.name}`);

            } catch (error: any) {
                console.error(`[scraper] Erro ao processar feed ${feedConfig.name}:`, error.message || error);
            }
        }

        console.log(`[scraper] Total de ${items.length} itens com conteúdo encontrados nos feeds RSS`);
        return items;
    }

    /**
     * Filtra apenas notícias novas (não existentes no banco)
     */
    async filterNew(items: RawNewsItem[]): Promise<RawNewsItem[]> {
        if (items.length === 0) return [];

        const sourceIds = items.map(i => i.sourceId);
        const existing = await prisma.post.findMany({
            where: { sourceId: { in: sourceIds } },
            select: { sourceId: true },
        });
        const existingSet = new Set(existing.map(e => e.sourceId));
        const newItems = items.filter(i => !existingSet.has(i.sourceId));
        console.log(`[scraper] ${newItems.length} notícias novas (de ${items.length} verificadas hoje)`);
        return newItems;
    }
}
