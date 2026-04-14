import prisma from './index';

/**
 * Busca configurações mesclando valores globais com overrides de conta específica.
 * @param accountId ID da conta para buscar overrides (ex: 'Tiobred')
 * @param keys Lista de chaves de configuração desejadas
 * @returns Um objeto mapeando chaves para seus valores efetivos
 */
export async function getMergedConfigs(rawAccountId: string, keys: string[]) {
    const accountId = rawAccountId.toLowerCase();
    const configs = await prisma.systemConfig.findMany({
        where: {
            key: { in: keys },
            OR: [
                { accountId: 'global' },
                { accountId }
            ]
        }
    });

    const merged: Record<string, any> = {};
    for (const key of keys) {
        const globalConfig = configs.find(c => c.key === key && c.accountId === 'global');
        const accountConfig = configs.find(c => c.key === key && c.accountId === accountId);

        if (key === 'SCHEDULER_TRIGGERS') {
            const parseTriggers = (val: any): any[] => {
                if (!val) return [];
                try {
                    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                    return Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                    return [];
                }
            };
            const gTriggers = parseTriggers(globalConfig?.value);
            const aTriggers = accountId !== 'global' ? parseTriggers(accountConfig?.value) : [];
            
            // OVERRIDE semantics: se a conta tem triggers próprios, usa SOMENTE os da conta.
            // Isso garante que ao salvar uma nova agenda, os triggers antigos (globais ou da conta anterior)
            // são completamente substituídos sem deixar registros fantasma.
            const effective = aTriggers.length > 0 ? aTriggers : gTriggers;
            
            // Deduplicate for safety
            const seen = new Set<string>();
            merged[key] = effective.filter(t => {
                const content = JSON.stringify({ 
                    type: t.type, 
                    value: t.value, 
                    minute: t.minute, 
                    hour: t.hour,
                    time: t.time,
                    days: Array.isArray(t.days) ? [...t.days].sort().join(',') : undefined
                });
                if (seen.has(content)) return false;
                seen.add(content);
                return true;
            });
        } else {
            merged[key] = accountConfig !== undefined ? accountConfig.value : (globalConfig !== undefined ? globalConfig.value : undefined);
        }
    }
    return merged;
}
