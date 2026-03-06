# Workflow: Setup Instagram
# Ativação: /setup-instagram
# Descrição: Guia passo a passo para configurar a API do Instagram Business

## Passo 1 — Verificar Pré-requisitos

Pergunte ao usuário:

```
Para conectar o Instagram, você precisa de:

1. Uma conta Instagram Business ou Creator (não conta pessoal)
2. Uma página do Facebook vinculada a essa conta Instagram
3. Acesso ao Meta for Developers (developers.facebook.com)

Você já tem tudo isso? (sim/não/preciso de ajuda)
```

---

## Passo 2 — Criar App no Meta Developers

Se o usuário precisar criar o app, guie:

```
No Meta for Developers:

1. Acesse: https://developers.facebook.com/apps
2. Clique em "Criar App"
3. Escolha tipo: "Outro" → "Empresa"
4. Dê um nome ao app (ex: "Monitor Econômico")
5. Adicione o produto "Instagram Graph API"

Permissões necessárias:
✓ instagram_content_publish
✓ instagram_manage_media  
✓ pages_read_engagement
✓ instagram_basic

Me avise quando criar o app para continuar.
```

---

## Passo 3 — Obter Token de Acesso

```
Com o app criado:

1. No painel do app, vá em: Instagram Graph API → Gerar Token
2. Selecione a conta Instagram que quer usar
3. Marque todas as permissões listadas acima
4. Clique em "Gerar Token"

⚠️ Token de curta duração: válido por 1 hora. 
Vou gerar o comando para converter para token de longa duração (60 dias).

Cole o token aqui quando tiver (não preocupe, é só para gerar o comando de conversão).
```

Quando o usuário colar o token, gere o comando curl para conversão:

```bash
curl -i -X GET "https://graph.facebook.com/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={TOKEN_CURTO}"
```

---

## Passo 4 — Obter Instagram User ID

```bash
# Execute este comando com seu token de longa duração:
curl "https://graph.facebook.com/v19.0/me/accounts?access_token={SEU_TOKEN}"

# Na resposta, encontre o Instagram Business Account ID:
curl "https://graph.facebook.com/v19.0/{PAGE_ID}?fields=instagram_business_account&access_token={SEU_TOKEN}"
```

---

## Passo 5 — Atualizar .env

Gere o trecho do .env para o usuário copiar:

```env
# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=seu_token_de_longa_duracao_aqui
INSTAGRAM_USER_ID=seu_instagram_business_account_id_aqui
```

---

## Passo 6 — Testar Conexão

Gere um script de teste:

```typescript
// scripts/test-instagram.ts
import { InstagramPublisher } from '../lib/social/instagram';

async function test() {
  const ig = new InstagramPublisher();
  
  // Teste com imagem placeholder
  const result = await ig.publishPost({
    imageUrl: 'https://via.placeholder.com/1080x1080/1a1a2e/ffffff?text=Teste',
    caption: '🧪 Teste de integração - Monitor Econômico Brasil\n\n#teste #economia'
  });
  
  console.log('✅ Post publicado com ID:', result.postId);
  console.log('Ver em: https://www.instagram.com/p/' + result.postId);
}

test().catch(console.error);
```

```
Execute com: npx ts-node scripts/test-instagram.ts

Se der erro, me mostre a mensagem de erro para diagnosticar.
```
