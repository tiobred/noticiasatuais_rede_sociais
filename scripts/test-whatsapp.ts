#!/usr/bin/env ts-node
/**
 * Testa envio de mensagem via Evolution API (WhatsApp)
 * Uso: npx ts-node --project tsconfig.scripts.json scripts/test-whatsapp.ts
 */

import 'dotenv/config';
import { WhatsAppPublisher } from '../lib/social/whatsapp';

async function main() {
    console.log('\n📱 Testando WhatsApp via Evolution API...\n');

    const wa = new WhatsAppPublisher();
    const destination = process.env.WHATSAPP_DESTINATION!;

    console.log(`📤 Enviando para: ${destination}`);
    const result = await wa.sendText(
        `🧪 *Teste — Notícia da Hora*\n\n✅ Integração WhatsApp funcionando!\n\n_Sistema de notícias econômicas do Brasil_\n\n${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
    );

    console.log(`\n✅ Mensagem enviada! ID: ${result.messageId}`);
    console.log('📱 Verifique seu WhatsApp agora!\n');
}

main().catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
