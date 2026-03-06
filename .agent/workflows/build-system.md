# Workflow: Build System
# Ativação: /build-system
# Descrição: Gera toda a estrutura do projeto fullstack baseado no PRD aprovado
# Pré-requisito: PRD gerado via /prd-interview

## Passo 1 — Confirmar PRD

Verifique se há um PRD aprovado na conversa atual ou no arquivo `PRD.md` do workspace.
Se não houver, diga: "Nenhum PRD encontrado. Execute /prd-interview primeiro."

// turbo
---

## Passo 2 — Gerar Estrutura de Arquivos

Crie toda a estrutura de pastas e arquivos do projeto de uma vez:

```
[nome-do-projeto]/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── layout.tsx
│       │   ├── dashboard/
│       │   │   └── page.tsx        ← Dashboard principal
│       │   ├── posts/
│       │   │   └── page.tsx        ← Gerenciamento de posts
│       │   ├── agents/
│       │   │   └── page.tsx        ← Monitor de agentes
│       │   ├── settings/
│       │   │   └── page.tsx        ← Configurações
│       │   ├── api/
│       │   │   ├── auth/[...nextauth]/route.ts
│       │   │   ├── posts/route.ts
│       │   │   ├── agents/run/route.ts
│       │   │   └── health/route.ts
│       │   ├── layout.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── ui/                 ← shadcn components
│       │   ├── dashboard/
│       │   │   ├── MetricCard.tsx
│       │   │   ├── AgentStatus.tsx
│       │   │   └── PostFeed.tsx
│       │   └── layout/
│       │       ├── Sidebar.tsx
│       │       └── TopBar.tsx
│       ├── lib/
│       │   ├── agents/
│       │   │   ├── orchestrator.ts
│       │   │   ├── scraper-agent.ts
│       │   │   ├── analysis-agent.ts
│       │   │   └── publisher-agent.ts
│       │   ├── social/
│       │   │   ├── instagram.ts
│       │   │   └── whatsapp.ts
│       │   ├── db/
│       │   │   └── index.ts        ← Prisma client
│       │   ├── scheduler.ts
│       │   ├── auth.ts
│       │   └── utils.ts
│       ├── prisma/
│       │   └── schema.prisma
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       └── tsconfig.json
├── .agent/                         ← (já existe)
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── .env.example
├── .gitignore
└── README.md
```

// turbo

---

## Passo 3 — Gerar Código Core

Gere os seguintes arquivos em sequência:

### 3a. Schema do Banco (Prisma)
Baseado no PRD, crie `prisma/schema.prisma` com os models:
- `Post` (dados coletados + processados pela IA)
- `SocialPublication` (registro de publicações por canal)
- `AgentRun` (log de execuções dos agentes)
- `SystemConfig` (configurações chave-valor)
- `User` (autenticação com roles)
- `AuditLog` (log de ações sensíveis)

### 3b. Agentes Core
Gere os 4 agentes principais adaptados ao contexto do PRD:
- `scraper-agent.ts` — coleta das fontes definidas no PRD
- `analysis-agent.ts` — análise via Anthropic com tom e formato definidos no PRD
- `publisher-agent.ts` — publicação nos canais definidos no PRD
- `orchestrator.ts` — coordena os 3 agentes acima com retry e logging

### 3c. Dashboard Principal
Gere `app/dashboard/page.tsx` com:
- Grid de 4 métricas no topo
- Feed de posts (2/3 da largura) com status badges
- Painel de agentes (1/3 da largura) com status em tempo real
- Botão "Executar Pipeline Agora"
- Dark mode, fonte DM Mono, paleta Antigravity

// turbo

---

## Passo 4 — Configurações e Infraestrutura

Gere automaticamente:

### docker-compose.yml
Serviços: web (Next.js), postgres, redis, nginx

### .env.example
Todas as variáveis necessárias com comentários explicativos:
- Credenciais do banco
- ANTHROPIC_API_KEY
- Credenciais Instagram (INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID)
- Credenciais WhatsApp (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)
- NEXTAUTH_SECRET e NEXTAUTH_URL

### GitHub Actions CI/CD
- `ci.yml`: lint + typecheck + test em cada PR
- `deploy.yml`: deploy automático no push para main

// turbo

---

## Passo 5 — README e Documentação

Gere `README.md` com:
1. Descrição do sistema (baseada no PRD)
2. Pré-requisitos
3. Setup local (passo a passo)
4. Configuração das APIs sociais (Instagram + WhatsApp)
5. Como rodar os agentes manualmente
6. Como fazer deploy

---

## Passo 6 — Checklist Final

Ao concluir, apresente ao usuário:

```
✅ Sistema gerado com sucesso!

📁 Estrutura criada: [X] arquivos em [Y] pastas

Próximos passos:
1. Copie .env.example para .env e preencha as credenciais
2. Execute: docker-compose up -d (sobe postgres + redis)
3. Execute: npx prisma migrate dev (cria as tabelas)
4. Execute: npm run dev (inicia o sistema)
5. Acesse: http://localhost:3000

Para configurar as APIs sociais, consulte:
→ /setup-instagram para configurar o Instagram
→ /setup-whatsapp para configurar o WhatsApp
→ /deploy para fazer o deploy em produção
```
