# Workflow: Setup WhatsApp
# Ativação: /setup-whatsapp
# Descrição: Configura WhatsApp Business API para envio de mensagens automáticas

## Passo 1 — Verificar Tipo de Conta Necessária

```
Existem duas formas de usar WhatsApp para automação:

OPÇÃO A — WhatsApp Business API (Meta oficial)
✓ Recomendado para produção
✓ Suporte a broadcast lists e templates
✓ Requer aprovação da Meta (2-7 dias)
✓ Número dedicado (não pode ser número pessoal ativo)

OPÇÃO B — WhatsApp via Evolution API (auto-hospedado)
✓ Mais rápido para começar
✓ Usa seu número pessoal/business existente
⚠️ Contra os termos do WhatsApp (risco de ban)
⚠️ Não recomendado para uso em produção escalável

Qual opção você prefere?
```

---

## Passo 2a — WhatsApp Business API (Meta)

```
No Meta for Developers (mesmo app do Instagram se já criou):

1. Adicione o produto "WhatsApp" ao seu app
2. Em WhatsApp → Getting Started, você verá:
   - Phone Number ID (anote)
   - WhatsApp Business Account ID (anote)
   - Token de teste temporário (válido 24h)

3. Para número permanente:
   - Adicione um número de telefone real que NÃO está no WhatsApp
   - Verifique por SMS ou ligação
   - Solicite número permanente de produção

Me avise quando tiver o Phone Number ID.
```

Após o usuário fornecer o ID:

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_ACCESS_TOKEN=seu_token_permanente
WHATSAPP_BUSINESS_ACCOUNT_ID=seu_waba_id
```

---

## Passo 2b — Evolution API (alternativa)

Gere o docker-compose para Evolution API:

```yaml
# Adicionar ao docker-compose.yml
evolution-api:
  image: atendai/evolution-api:latest
  ports:
    - "8080:8080"
  environment:
    - SERVER_URL=http://localhost:8080
    - AUTHENTICATION_API_KEY=sua_chave_secreta
    - DATABASE_ENABLED=true
    - DATABASE_CONNECTION_URI=postgresql://postgres:${DB_PASSWORD}@postgres:5432/evolution
  depends_on:
    - postgres
```

```env
# Evolution API (alternativa)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_chave_secreta
EVOLUTION_INSTANCE=minha-instancia
```

---

## Passo 3 — Criar Template de Mensagem

Para WhatsApp Business API, mensagens iniciais precisam de template aprovado:

```
No Meta Business Suite:

1. Acesse: business.facebook.com → WhatsApp Manager
2. Vá em: Gerenciar → Modelos de mensagem
3. Crie um template:
   - Nome: economia_brasil_update
   - Idioma: Português (Brasil)  
   - Categoria: UTILITY
   - Corpo: "📊 *{{1}}*\n\n{{2}}\n\n_Monitor Econômico Brasil_"

4. Aguarde aprovação (geralmente < 24h)
```

---

## Passo 4 — Configurar Lista de Broadcast

```typescript
// No dashboard, vá em Settings → WhatsApp
// Ou insira diretamente no banco:

await db.systemConfig.upsert({
  where: { key: 'whatsapp_broadcast_list' },
  create: {
    key: 'whatsapp_broadcast_list',
    value: ['5511999999999', '5521888888888'] // formato: 55 + DDD + número
  },
  update: {
    value: ['5511999999999', '5521888888888']
  }
});
```

---

## Passo 5 — Testar Envio

```typescript
// scripts/test-whatsapp.ts
import { WhatsAppPublisher } from '../lib/social/whatsapp';

async function test() {
  const wa = new WhatsAppPublisher();
  
  const result = await wa.sendText({
    to: '5511999999999', // seu próprio número para teste
    message: '🧪 Teste - Monitor Econômico Brasil está funcionando!'
  });
  
  console.log('✅ Mensagem enviada! ID:', result.messageId);
}

test().catch(console.error);
```

```
Execute: npx ts-node scripts/test-whatsapp.ts

Você deve receber uma mensagem no WhatsApp em segundos.
Se não receber, me mostre o erro para diagnosticar.
```
