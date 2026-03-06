/**
 * LLM Router — gerencia uso de múltiplos provedores de LLM
 * Estratégia: Round-robin com fallback automático em caso de erro/rate-limit
 *
 * Provedores:
 *   1. OpenRouter  → openai/gpt-oss-120b  (gratuito)
 *   2. Gemini      → gemini-2.0-flash     (gratuito no tier básico)
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Contadores de uso por sessão ────────────────────────────────────────────
const usage = {
    openrouter: { calls: 0, errors: 0, lastError: 0 },
    gemini: { calls: 0, errors: 0, lastError: 0 },
};

const COOLDOWN_MS = 5 * 60 * 1000; // 5 min de cooldown após erro de rate-limit

// ─── Clientes ─────────────────────────────────────────────────────────────────
const openrouterClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY ?? 'missing',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://noticia-da-hora.vercel.app',
        'X-Title': 'Notícia da Hora',
    },
});

const geminiClient = process.env.GOOGLE_AI_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    : null;

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'openai/gpt-oss-120b';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAvailable(provider: 'openrouter' | 'gemini'): boolean {
    const u = usage[provider];
    if (provider === 'gemini' && !geminiClient) return false;
    if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) return false;
    // Se teve erro recente, aguarda cooldown
    if (u.errors > 0 && Date.now() - u.lastError < COOLDOWN_MS) return false;
    return true;
}

function pickProvider(): 'openrouter' | 'gemini' {
    const orAvailable = isAvailable('openrouter');
    const gemAvailable = isAvailable('gemini');

    if (!orAvailable && !gemAvailable) {
        throw new Error('[llm-router] Nenhum provedor de LLM disponível!');
    }
    if (!orAvailable) return 'gemini';
    if (!gemAvailable) return 'openrouter';

    // Round-robin: usa quem tem menos chamadas
    return usage.openrouter.calls <= usage.gemini.calls ? 'openrouter' : 'gemini';
}

function markError(provider: 'openrouter' | 'gemini') {
    usage[provider].errors++;
    usage[provider].lastError = Date.now();
}

// ─── Interface comum ──────────────────────────────────────────────────────────
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Envia uma conversa para o LLM e retorna a resposta como string JSON pura.
 * Tenta o provedor primário, e em caso de falha faz fallback automático.
 */
export async function chat(messages: ChatMessage[], opts?: {
    maxTokens?: number;
    temperature?: number;
}): Promise<string> {
    const primary = pickProvider();
    const secondary = primary === 'openrouter' ? 'gemini' : 'openrouter';

    try {
        const result = await callProvider(primary, messages, opts);
        usage[primary].calls++;
        return result;
    } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[llm-router] ⚠ ${primary} falhou: ${errMsg}. Tentando ${secondary}...`);
        markError(primary);

        if (!isAvailable(secondary)) {
            throw new Error(`[llm-router] Ambos os provedores indisponíveis. Último erro: ${errMsg}`);
        }

        const result = await callProvider(secondary, messages, opts);
        usage[secondary].calls++;
        return result;
    }
}

async function callProvider(
    provider: 'openrouter' | 'gemini',
    messages: ChatMessage[],
    opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
    console.log(`[llm-router] Usando ${provider} (OR:${usage.openrouter.calls} / GEM:${usage.gemini.calls} calls)`);

    if (provider === 'openrouter') {
        const response = await openrouterClient.chat.completions.create({
            model: OPENROUTER_MODEL,
            messages,
            temperature: opts?.temperature ?? 0.7,
            max_tokens: opts?.maxTokens ?? 2000,
            response_format: { type: 'json_object' },
        });
        const content = response.choices[0].message.content;
        if (!content) throw new Error('OpenRouter retornou resposta vazia');
        return content;
    }

    // Gemini
    if (!geminiClient) throw new Error('Gemini não configurado (GOOGLE_AI_API_KEY ausente)');

    const systemMsg = messages.find(m => m.role === 'system')?.content ?? '';
    const userMsgs = messages.filter(m => m.role !== 'system');
    const prompt = userMsgs.map(m => m.content).join('\n');

    const model = geminiClient.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemMsg,
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: opts?.temperature ?? 0.7,
            maxOutputTokens: opts?.maxTokens ?? 2000,
        },
    });

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) throw new Error('Gemini retornou resposta vazia');
    return content;
}

/** Retorna estatísticas do uso atual */
export function getRouterStats() {
    return {
        openrouter: { ...usage.openrouter, model: OPENROUTER_MODEL, available: isAvailable('openrouter') },
        gemini: { ...usage.gemini, model: GEMINI_MODEL, available: isAvailable('gemini') },
    };
}
