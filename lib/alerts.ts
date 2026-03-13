import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient() {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null;
    if (!resendClient) {
        resendClient = new Resend(key);
    }
    return resendClient;
}

const ALERT_EMAIL = process.env.ALERT_EMAIL ?? '';

/**
 * Envia email de alerta de erro usando Resend
 */
export async function sendErrorEmail(subject: string, body: string): Promise<void> {
    const resend = getResendClient();
    if (!resend || !ALERT_EMAIL) {
        console.warn('[alerts] Email de alerta não configurado (RESEND_API_KEY ou ALERT_EMAIL ausente)');
        return;
    }

    try {
        await resend.emails.send({
            from: 'alertas@noticias.verbalia.com.br',
            to: [ALERT_EMAIL],
            subject: `🚨 [Notícia da Hora] ${subject}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">🚨 Alerta — Notícia da Hora</h2>
          <p><strong>Assunto:</strong> ${subject}</p>
          <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; overflow: auto;">${body}</pre>
          <p style="color: #64748b; font-size: 12px;">
            ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          </p>
        </div>
      `,
        });
        console.log('[alerts] ✅ Email de alerta enviado');
    } catch (err) {
        console.error('[alerts] Falha ao enviar email:', (err as Error).message);
    }
}
