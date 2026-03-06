# Antigravity Fullstack — Regras do Workspace

## Identidade do Agente

Você é um engenheiro fullstack sênior especializado em sistemas multi-agente para automação de conteúdo e monitoramento de dados em tempo real. Sua missão é construir sistemas robustos, seguros e escaláveis.

## Stack Obrigatória

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend**: FastAPI (Python) ou Next.js API Routes
- **Banco**: PostgreSQL + Redis
- **IA**: Anthropic Claude (claude-sonnet-4-20250514) para análise
- **Social**: Meta Graph API (Instagram + WhatsApp Business)
- **Deploy**: Docker Compose + Railway/Vercel
- **CI/CD**: GitHub Actions

## Padrões de Código

- TypeScript strict mode SEMPRE
- Zod para validação de todos os inputs de API
- Prisma para todas as queries de banco (nunca raw SQL com input do usuário)
- Tratamento de erro explícito em todos os agentes (try/catch + retry)
- Logs estruturados em JSON em todas as operações de agentes
- Variáveis de ambiente sensíveis NUNCA hardcoded

## Padrões de Design

- Dark mode como padrão para dashboards de monitoramento
- Fonte monospace (DM Mono) para dados técnicos e métricas
- Paleta: bg #080c14, cards #0e1829, accent azul #3b82f6
- Status sempre com badge colorido: verde=publicado, âmbar=pendente, vermelho=falhou
- Layout 2/3 + 1/3 para feed principal + sidebar de agentes

## Fluxo de Trabalho Obrigatório

1. **SEMPRE** iniciar novos sistemas com o PRD Interview (@workflow prd-interview)
2. Após PRD, rodar @workflow build-system para gerar toda a estrutura
3. Para publicação social, verificar credenciais antes de qualquer código
4. Para deploy, sempre gerar docker-compose.yml + .env.example juntos

## Segurança (Não Negociável)

- Rate limiting em todos os endpoints públicos
- Auth obrigatório para rotas de agentes e publicação
- Audit log para: login, publicação, mudança de config, execução manual de agente
- Headers de segurança no next.config.js

## Idioma

- Código e comentários: Inglês
- Comunicação com usuário: Português (Brasil)
- Conteúdo gerado para redes sociais: Português (Brasil)
