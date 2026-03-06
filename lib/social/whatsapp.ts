import axios from 'axios';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL!.replace(/\/$/, '');
const API_KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE = encodeURIComponent(process.env.EVOLUTION_INSTANCE!);
const DEFAULT_DESTINATION = process.env.WHATSAPP_DESTINATION!;

export interface WhatsAppResult {
    messageId: string;
}

/**
 * WhatsApp Publisher — envia mensagens via Evolution API
 */
export class WhatsAppPublisher {

    private headers = {
        'Content-Type': 'application/json',
        apikey: API_KEY,
    };

    /**
     * Envia mensagem de texto para um número
     */
    async sendText(message: string, to: string = DEFAULT_DESTINATION): Promise<WhatsAppResult> {
        console.log(`[whatsapp] Enviando mensagem para ${to}...`);

        const { data } = await axios.post(
            `${EVOLUTION_URL}/message/sendText/${INSTANCE}`,
            {
                number: to,
                text: message,
            },
            { headers: this.headers }
        );

        const messageId = data?.key?.id ?? data?.id ?? 'sem-id';
        console.log(`[whatsapp] ✅ Mensagem enviada: ${messageId}`);
        return { messageId };
    }

    /**
     * Envia imagem com legenda
     */
    async sendImage(imageUrl: string, caption: string, to: string = DEFAULT_DESTINATION): Promise<WhatsAppResult> {
        console.log(`[whatsapp] Enviando imagem para ${to}...`);

        const { data } = await axios.post(
            `${EVOLUTION_URL}/message/sendMedia/${INSTANCE}`,
            {
                number: to,
                mediatype: 'image',
                media: imageUrl,
                caption,
            },
            { headers: this.headers }
        );

        const messageId = data?.key?.id ?? data?.id ?? 'sem-id';
        console.log(`[whatsapp] ✅ Imagem enviada: ${messageId}`);
        return { messageId };
    }

    /**
     * Envia alerta de erro ao administrador
     */
    async sendAlert(errorMessage: string, to: string = DEFAULT_DESTINATION): Promise<void> {
        const message = `🚨 *ALERTA — Notícia da Hora*\n\n${errorMessage}\n\n_${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}_`;
        await this.sendText(message, to).catch(console.error);
    }
}
