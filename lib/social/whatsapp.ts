import axios from 'axios';

function getWhatsAppConfigs() {
    const url = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE ? encodeURIComponent(process.env.EVOLUTION_INSTANCE) : '';
    const destination = process.env.WHATSAPP_DESTINATION;

    if (!url || !apiKey || !instance || !destination) {
        throw new Error('WhatsApp env vars not configured (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, WHATSAPP_DESTINATION)');
    }

    return { url, apiKey, instance, destination };
}

export interface WhatsAppResult {
    messageId: string;
}

/**
 * WhatsApp Publisher — envia mensagens via Evolution API
 */
export class WhatsAppPublisher {

    private getHeaders() {
        const { apiKey } = getWhatsAppConfigs();
        return {
            'Content-Type': 'application/json',
            apikey: apiKey,
        };
    }

    /**
     * Envia mensagem de texto para um número
     */
    async sendText(message: string, to?: string): Promise<WhatsAppResult> {
        const configs = getWhatsAppConfigs();
        const targetNumber = to || configs.destination;
        console.log(`[whatsapp] Enviando mensagem para ${targetNumber}...`);

        const { data } = await axios.post(
            `${configs.url}/message/sendText/${configs.instance}`,
            {
                number: targetNumber,
                text: message,
            },
            { headers: this.getHeaders() }
        );

        const messageId = data?.key?.id ?? data?.id ?? 'sem-id';
        console.log(`[whatsapp] ✅ Mensagem enviada: ${messageId}`);
        return { messageId };
    }

    /**
     * Envia imagem com legenda
     */
    async sendImage(imageUrl: string, caption: string, to?: string): Promise<WhatsAppResult> {
        const configs = getWhatsAppConfigs();
        const targetNumber = to || configs.destination;
        console.log(`[whatsapp] Enviando imagem para ${targetNumber}...`);

        const { data } = await axios.post(
            `${configs.url}/message/sendMedia/${configs.instance}`,
            {
                number: targetNumber,
                mediatype: 'image',
                media: imageUrl,
                caption,
            },
            { headers: this.getHeaders() }
        );

        const messageId = data?.key?.id ?? data?.id ?? 'sem-id';
        console.log(`[whatsapp] ✅ Imagem enviada: ${messageId}`);
        return { messageId };
    }

    /**
     * Envia alerta de erro ao administrador
     */
    async sendAlert(errorMessage: string, to?: string): Promise<void> {
        const configs = getWhatsAppConfigs();
        const targetNumber = to || configs.destination;
        const message = `🚨 *ALERTA — Notícia da Hora*\n\n${errorMessage}\n\n_${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}_`;
        await this.sendText(message, targetNumber).catch(console.error);
    }
}
