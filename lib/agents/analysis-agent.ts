import { chat } from '@/lib/llm-router';
import { truncate } from '@/lib/utils';

const SYSTEM_PROMPT = `Você é um analista econômico especializado na economia brasileira.
Sua função: analisar notícias econômicas globais e explicar o impacto direto no Brasil de forma analítica e clara.
Público: economistas, investidores e interessados em gestão de ativos financeiros.
Tom: analítico, objetivo e profissional — sem sensacionalismo.

Ao receber uma notícia em qualquer idioma, você deve:
1. Traduzir e analisar o conteúdo em português brasileiro
2. Focar no impacto concreto para: câmbio (BRL/USD), Ibovespa, Selic, IPCA, agronegócio, ativos brasileiros
3. Ser específico com dados quando disponíveis
4. Usar linguagem acessível mas precisa`;

export interface AnalyzedPost {
  title: string;
  body: string;
  hashtags: string[];
  instagram: { feed: string; story: string };
  linkedin: string;
  whatsapp: string;
}

export interface BatchAnalyzedPost {
  globalCaption: string;
  whatsappConsolidated: string;
  items: {
    title: string;
    summary: string;
    whatsappCaption: string;
    hashtags: string[];
  }[];
}

/**
 * Analysis Agent — usa o LLM Router com fallback automático entre
 * OpenRouter (gpt-oss-120b) e Google Gemini (gemini-2.0-flash)
 */
export class AnalysisAgent {

  async analyze(rawTitle: string, rawBody: string, tags: string[]): Promise<AnalyzedPost> {
    console.log(`[analysis] Analisando: "${truncate(rawTitle, 60)}"...`);

    const userPrompt = `
NOTÍCIA ORIGINAL:
Título: ${rawTitle}
Conteúdo: ${rawBody}
Tags: ${tags.join(', ')}

Gere um JSON com exatamente esta estrutura (sem markdown, só o JSON puro):
{
  "title": "Título em PT-BR, chamativo e analítico, máx. 80 chars",
  "body": "Análise completa em PT-BR, 150-250 palavras. Explique o impacto para a economia brasileira com dados concretos. Mencione câmbio, Ibovespa, setores afetados quando relevante.",
  "hashtags": ["array", "com", "10", "hashtags", "relevantes", "em", "pt-br", "sem", "o", "hash"],
  "instagram": {
    "feed": "Post para Instagram feed: emoji + título + 3 parágrafos curtos + hashtags. Máx. 2.200 chars.",
    "story": "Texto ultra-curto para story: máx. 3 linhas + emoji + 1 dado impactante"
  },
  "linkedin": "Post profissional para LinkedIn: subtítulo + análise 150 palavras + 5 hashtags. Tom mais formal.",
  "whatsapp": "Mensagem WhatsApp: *título em negrito* + resumo 3-4 linhas + link se disponível. Sem poluição visual."
}`.trim();

    const content = await chat(
      [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      { maxTokens: 2000 }
    );

    const parsed = JSON.parse(content) as AnalyzedPost;
    console.log(`[analysis] ✅ Análise concluída: "${truncate(parsed.title, 60)}"`);
    return parsed;
  }

  async summarizeBatch(newsItems: { title: string, body: string }[]): Promise<BatchAnalyzedPost> {
    console.log(`[analysis] Consolidando lote de ${newsItems.length} notícias...`);

    const itemsText = newsItems.map((item, idx) => `
ID: ${idx}
Título: ${item.title}
Conteúdo: ${item.body}
---`).join('\n');

    const userPrompt = `
LOTE DE NOTÍCIAS:
${itemsText}

Gere um JSON único consolidando estas notícias. A estrutura DEVE ser:
{
  "globalCaption": "Texto atraente para a legenda principal do Instagram (Carrossel). Liste as notícias em tópicos numerados com o novo título gerado por você. Use emojis e hashtags no final.",
  "whatsappConsolidated": "Mensagem única para WhatsApp: *RESUMO DO DIA* 📊\\n\\n1. *[Título 1]*\\n[Resumo 1]\\n\\n2. *[Título 2]*\\n[Resumo 2]\\n\\n... (inclua todas as notícias do lote)",
  "items": [
    {
      "title": "Novo título curto e impactante (PT-BR)",
      "summary": "Resumo analítico de 2-3 linhas sobre o impacto no Brasil.",
      "whatsappCaption": "*Título:* [Título]\\n\\n[Resumo]\\n\\n#economia #brasil",
      "hashtags": ["tags", "relevantes"]
    }
  ]
}

Regras:
1. "globalCaption" deve listar todas as notícias do lote de forma organizada.
2. "whatsappConsolidated" deve conter todas as notícias do lote em um único envio, separadas por quebra de linha dupla.
3. O array "items" deve ter o mesmo tamanho e ordem do lote original.
4. Foque em economia e mercado financeiro.`.trim();

    const content = await chat(
      [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      { maxTokens: 3000 }
    );

    const parsed = JSON.parse(content) as BatchAnalyzedPost;
    console.log(`[analysis] ✅ Consolidação de lote concluída (${parsed.items.length} itens)`);
    return parsed;
  }
}
