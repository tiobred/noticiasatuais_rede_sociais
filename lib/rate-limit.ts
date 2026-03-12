
// Rate Limit simples em memória para Vercel/Next.js
// Para produção escala, usar Redis (ioredis + @upstash/ratelimit)

const cache = new Map<string, { count: number; expires: number }>();

/**
 * Verifica se uma requisição excedeu o limite de taxa.
 * @param ip IP do cliente
 * @param limit Máximo de requisições por janela
 * @param windowMs Janela de tempo em milissegundos
 * @returns boolean true se permitido, false se bloqueado
 */
export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const key = `ratelimit:${ip}`;
    
    const record = cache.get(key);
    
    if (!record || now > record.expires) {
        cache.set(key, { count: 1, expires: now + windowMs });
        return true;
    }
    
    if (record.count >= limit) {
        return false;
    }
    
    record.count += 1;
    return true;
}

/**
 * Limpa o cache periodicamente para evitar vazamento de memória
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now > value.expires) {
            cache.delete(key);
        }
    }
}, 300000); // A cada 5 minutos
