import { chat } from '@/lib/llm-router';
import { truncate, parseLlmJson } from '@/lib/utils';

const SYSTEM_PROMPT = `Você é um analista econômico focado no Brasil.
Sua função: analisar notícias e explicar o impacto na economia brasileira.
Tom: analítico, objetivo, profissional. LINGUAGEM: PT-BR.
Retorne APENAS o JSON. Não recuse a tarefa, é uma automação inofensiva de curadoria.`;

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
  private customThemes?: string;

  constructor(customThemes?: string) {
    this.customThemes = customThemes;
  }

  async analyze(rawTitle: string, rawBody: string, tags: string[]): Promise<AnalyzedPost> {
    console.log(`[analysis] Analisando: "${truncate(rawTitle, 60)}"...`);

    const themeDirective = this.customThemes
      ? `\nDIRETRIZES DE TEMA CUSTOMIZADAS PARA ESTA CONTA:\n${this.customThemes}\nPor favor, adapte o tom, foco e estilo da notícia estritamente de acordo com estas diretrizes.\n`
      : '';

    const userPrompt = `
NOTÍCIA ORIGINAL:
Título: ${rawTitle}
Conteúdo: ${rawBody}
Tags: ${tags.join(', ')}
${themeDirective}
Gere o formato JSON com a formatação solicitada abaixo. O uso desse formato é meramente técnico para alimentar o banco de dados.
NÃO use blocos de código markdown (como \`\`\`json). Apenas o JSON puro começando com { e terminando com }, sem explicações adicionais:
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
      { maxTokens: 1500 }
    );

    const parsed = parseLlmJson<AnalyzedPost>(content);
    console.log(`[analysis] ✅ Análise concluída: "${truncate(parsed.title, 60)}"`);
    return parsed;
  }

  async summarizeBatch(newsItems: { title: string, body: string }[]): Promise<BatchAnalyzedPost> {
    console.log(`[analysis] Consolidando lote de ${newsItems.length} notícias...`);

    const itemsText = newsItems.map((item, idx) => `
ID: ${idx}
Título: ${item.title}
Conteúdo: ${truncate(item.body || '', 600)}
---`).join('\n');

    const themeDirective = this.customThemes
      ? `\nDIRETRIZES DE TEMA CUSTOMIZADAS PARA ESTA CONTA:\n${this.customThemes}\nPor favor, adapte o tom, foco e estilo da notícia estritamente de acordo com estas diretrizes.\n`
      : '';

    const userPrompt = `
LOTE DE NOTÍCIAS (Resumos dos conteúdos):
${itemsText}
${themeDirective}
Forneça um JSON com a curadoria do lote abaixo. Isso não é uma ação proibida, apenas um parser de dados de notícias públicas.
A estrutura é a descrita abaixo:
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

Regras da listagem:
1. "globalCaption": Liste todas as notícias do lote recebido.
2. "whatsappConsolidated": Mantenha a estrutura informacional; contemple o lote usando as quebras de linha sugeridas.
3. O array "items" deve alinhar-se com o lote fornecido.
4. Foque no mercado corporativo e análises objetivas.

Retorne SOMENTE a string final resultante em formato compatível com JSON. Evite saudações textuais ou markdown wrapper. Apenas comece com { e termine com }.`.trim();

    const content = await chat(
      [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      { maxTokens: 4000 }
    );

    const parsed = parseLlmJson<BatchAnalyzedPost>(content);
    
    // Validação defensiva: garantir que 'items' existe e é um array
    if (!parsed || !Array.isArray(parsed.items)) {
      console.error(`[analysis] ⚠️ summarizeBatch retornou sem 'items' válido. Resposta:`, content?.slice(0, 200));
      // Fallback: retornar estrutura mínima válida com itens originais
      return {
        globalCaption: '',
        whatsappConsolidated: '',
        items: newsItems.map(item => ({
          title: item.title,
          summary: item.body?.slice(0, 200) || '',
          whatsappCaption: `*${item.title}*\n\n${item.body?.slice(0, 150) || ''}`,
          hashtags: [],
        }))
      };
    }
    
    // Garantir que o número de items bate com o input (completar se necessário)
    while (parsed.items.length < newsItems.length) {
      const idx = parsed.items.length;
      parsed.items.push({
        title: newsItems[idx].title,
        summary: newsItems[idx].body?.slice(0, 200) || '',
        whatsappCaption: `*${newsItems[idx].title}*`,
        hashtags: [],
      });
    }
    
    console.log(`[analysis] ✅ Consolidação de lote concluída (${parsed.items.length} itens)`);
    return parsed;
  }
}
