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
            const parseTriggers = (val: any) => {
                if (!val) return [];
                const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                return Array.isArray(parsed) ? parsed : [parsed];
            };
            const gTriggers = parseTriggers(globalConfig?.value);
            const aTriggers = parseTriggers(accountConfig?.value);
            merged[key] = [...gTriggers, ...aTriggers];
        } else {
            merged[key] = accountConfig !== undefined ? accountConfig.value : (globalConfig !== undefined ? globalConfig.value : undefined);
        }
    }
    return merged;
}
