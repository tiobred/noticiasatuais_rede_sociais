# 📊 Notícia da Hora

> Sistema automatizado de inteligência econômica para o Brasil. Coleta notícias do [glint.trade](https://glint.trade/) a cada hora, analisa com OpenAI GPT-4 e publica automaticamente no Instagram, LinkedIn e WhatsApp.

---

## 🏗️ Arquitetura

```
glint.trade (a cada 1h)
    → ScraperAgent (Playwright)
    → AnalysisAgent (OpenAI GPT-4)
    → PublisherAgent
        ├── Instagram Feed + Stories (Meta Graph API)
        ├── LinkedIn (UGC Posts API)
        └── WhatsApp (Evolution API)
    → Dashboard (Next.js + PostgreSQL)
```

## 📋 Pré-requisitos

- Node.js 18+
- Docker + Docker Compose
- Conta OpenAI com acesso GPT-4
- App Meta for Developers (Instagram)
- Evolution API rodando na VPS
- Conta LinkedIn Developer (opcional)

## 🚀 Setup Local

### 1. Instalar dependências
```bash
npm install
npx playwright install chromium
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

### 3. Subir banco de dados
```bash
docker-compose up -d
```

### 4. Criar tabelas
```bash
npm run db:generate
npm run db:migrate
```

### 5. Iniciar o sistema
```bash
npm run dev
# Acesse: http://localhost:3000
```

---

## 🧪 Testes

```bash
# Testar scraping (sem publicar)
npm run test:pipeline -- --dry-run

# Testar Instagram
npm run test:instagram

# Testar WhatsApp
npm run test:whatsapp

# Rodar pipeline completo
npm run agents:run
```

---

## 🔧 Configuração das APIs

### Instagram
1. Acesse: [developers.facebook.com](https://developers.facebook.com/apps)
2. Crie um app → adicione Instagram Graph API
3. Gere token de longa duração (60 dias)
4. Adicione ao `.env`: `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_USER_ID`

👉 Use o workflow `/setup-instagram` para o passo a passo completo

### WhatsApp (Evolution API)
1. Certifique-se que a Evolution API está rodando na VPS Hertnez
2. Crie uma instância e conecte o número
3. Adicione ao `.env`: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`

👉 Use o workflow `/setup-whatsapp` para o passo a passo completo

### LinkedIn
1. Crie app em: [developer.linkedin.com](https://developer.linkedin.com)
2. Solicite permissão `w_member_social`
3. Adicione ao `.env`: `LINKEDIN_ACCESS_TOKEN` e `LINKEDIN_PERSON_ID`

---

## 🚢 Deploy (Vercel)

```bash
# Via workflow
/deploy

# Ou manualmente:
vercel --prod
```

Variáveis de ambiente necessárias na Vercel:
- `DATABASE_URL` (PostgreSQL externo — Supabase recomendado)
- `OPENAI_API_KEY`
- `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_USER_ID`
- `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_PERSON_ID`
- `EVOLUTION_API_URL` + `EVOLUTION_API_KEY` + `EVOLUTION_INSTANCE`
- `RESEND_API_KEY` + `ALERT_EMAIL`
- `NEXTAUTH_SECRET` + `NEXTAUTH_URL`

---

## 📁 Estrutura do Projeto

```
├── app/                    # Next.js App Router
│   ├── dashboard/          # Dashboard principal
│   ├── api/                # APIs REST
│   └── globals.css         # Design system
├── components/             # Componentes React
│   ├── dashboard/          # MetricCard, PostFeed, AgentStatus
│   └── layout/             # Sidebar, TopBar
├── lib/
│   ├── agents/             # Scraper, Analysis, Publisher, Orchestrator
│   ├── social/             # Instagram, LinkedIn, WhatsApp
│   └── db/                 # Prisma client
├── prisma/                 # Schema + migrações
├── scripts/                # Scripts de teste
└── docker-compose.yml      # PostgreSQL + Redis
```

---

## 🤝 Créditos

Construído com: Next.js 14 · Prisma · OpenAI GPT-4 · Playwright · Meta Graph API · Evolution API · Resend
