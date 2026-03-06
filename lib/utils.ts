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
