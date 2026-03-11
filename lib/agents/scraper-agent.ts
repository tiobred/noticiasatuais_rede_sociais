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
    postOriginal?: boolean;
    metadata?: any;
}

const DEFAULT_FEEDS = [
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
    private accountId: string;
    private feeds: { name: string, url: string }[];

    constructor(limit: number = 2, accountId: string, dataSources: { name: string, url: string }[] = []) {
        this.limit = limit;
        this.accountId = accountId;
        // Valida e usa fontes customizadas apenas se forem não nulas e tiverem URL válida (começando com http)
        const validSources = dataSources.filter(s => s && s.url && s.url.startsWith('http'));
        this.feeds = validSources.length > 0 ? validSources : DEFAULT_FEEDS;

        this.parser = new Parser({
            customFields: {
                item: ['description', 'content:encoded', 'category']
            }
        });
    }

    async init(): Promise<void> {
        // Inicialização rápida, sem necessidade de browser
        console.log(`[scraper|${this.accountId}] Inicializando RSS parser com ${this.feeds.length} fontes...`);
    }

    async close(): Promise<void> {
        // Nenhum recurso pesado para fechar
        console.log(`[scraper|${this.accountId}] RSS parser finalizado.`);
    }

    /**
     * Coleta as notícias dos feeds RSS configurados
     */
    async scrape(): Promise<RawNewsItem[]> {
        const items: RawNewsItem[] = [];

        for (const feedConfig of this.feeds) {
            try {
                console.log(`[scraper|${this.accountId}] Buscando feed: ${feedConfig.name} (${feedConfig.url})`);
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
                    let imageUrl: string | undefined = undefined;

                    // 1. Tentar encontrar <img> no HTML
                    const imageEl = $('img').first();
                    imageUrl = imageEl.attr('src') ?? undefined;

                    // 2. Tentar encontrar no 'enclosure' (padrão RSS)
                    if (!imageUrl && item.enclosure && item.enclosure.url) {
                        imageUrl = item.enclosure.url;
                    }

                    // 3. Tentar encontrar no 'media:content' (padrão comum em feeds modernos)
                    if (!imageUrl && (item as any)['media:content'] && (item as any)['media:content'].$) {
                        imageUrl = (item as any)['media:content'].$.url;
                    }
                    if (!imageUrl && (item as any)['media:thumbnail'] && (item as any)['media:thumbnail'].$) {
                        imageUrl = (item as any)['media:thumbnail'].$.url;
                    }

                    // Ignorar se não tiver título (aceita conteúdo curto, pois alguns feeds enviam apenas resumos breves)
                    if (!title) continue;

                    // Categorias / Tags
                    let tags: string[] = [];
                    if (Array.isArray(item.categories)) {
                        tags = item.categories.map(c => typeof c === 'string' ? c : (c as any)._ ?? '').filter(Boolean);
                    } else if (item.categories && typeof item.categories === 'string') {
                        tags = [item.categories];
                    }

                    tags.push(`account:${this.accountId}`);

                    const sourceContent = `${title}\n${bodyText}`;
                    const sourceId = hashContent(`${this.accountId}_${sourceContent}`);

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
                console.log(`[scraper|${this.accountId}] ${recentItems.length} itens processados de ${feedConfig.name}`);

            } catch (error: any) {
                console.error(`[scraper|${this.accountId}] Erro ao processar feed ${feedConfig.name}:`, error.message || error);
            }
        }

        console.log(`[scraper|${this.accountId}] Total de ${items.length} itens com conteúdo encontrados nos feeds RSS`);
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
        console.log(`[scraper|${this.accountId}] ${newItems.length} notícias novas exclusivas para a conta (de ${items.length} verificadas hoje)`);
        return newItems;
    }
}
