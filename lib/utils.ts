import { createHash } from 'crypto';

/**
 * Gera SHA-256 de um texto para deduplicação
 */
export function hashContent(content: string): string {
    return createHash('sha256').update(content.trim()).digest('hex');
}

/**
 * Formata data para exibição no Brasil
 */
export function formatDateBR(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
    }).format(date);
}

/**
 * Aguarda N milissegundos
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Tenta executar uma função com retry exponencial
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000,
): Promise<T> {
    let lastError: Error;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err as Error;
            if (attempt < maxRetries - 1) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                console.warn(`[retry] Tentativa ${attempt + 1} falhou. Aguardando ${delay}ms...`);
                await sleep(delay);
            }
        }
    }
    throw lastError!;
}

/**
 * Trunca texto para um limite máximo de caracteres
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extrai JSON com segurança de blocos markdown do LLM
 */
export function parseLlmJson<T>(content: string): T {
    let cleanContent = content.trim();

    // Remove code blocks
    if (cleanContent.startsWith('```')) {
        const firstNewLine = cleanContent.indexOf('\n');
        if (firstNewLine !== -1) {
            cleanContent = cleanContent.slice(firstNewLine + 1);
        }
        if (cleanContent.endsWith('```')) {
            cleanContent = cleanContent.slice(0, -3).trim();
        }
    }

    try {
        return JSON.parse(cleanContent) as T;
    } catch (e) {
        // Fallback: Tentativa de extrair o JSON se o LLM injetou texto antes ou depois
        try {
            const firstBrace = cleanContent.indexOf('{');
            const lastBrace = cleanContent.lastIndexOf('}');
            const firstBracket = cleanContent.indexOf('[');
            const lastBracket = cleanContent.lastIndexOf(']');

            let start = -1;
            let end = -1;

            if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
                start = firstBrace;
                end = lastBrace;
            } else if (firstBracket !== -1 && lastBracket !== -1) {
                start = firstBracket;
                end = lastBracket;
            }

            if (start !== -1 && end !== -1 && end > start) {
                const extracted = cleanContent.substring(start, end + 1);
                return JSON.parse(extracted) as T;
            }
        } catch (fallbackError) {
            // Se o fallback também falhar, segue para o erro crítico
        }

        console.error('[utils] Erro crítico ao parsear JSON do LLM. Conteúdo truncado recebido:', cleanContent.substring(0, 200) + '...', '... (total chars: ' + cleanContent.length + ')');
        throw e;
    }
}
