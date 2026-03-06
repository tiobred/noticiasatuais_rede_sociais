# Workflow: Deploy
# Ativação: /deploy
# Descrição: Deploy completo do sistema para produção

## Passo 1 — Escolher Plataforma

```
Onde você quer fazer o deploy?

1. Railway (recomendado para iniciantes) — $5-20/mês
2. Vercel + Supabase — melhor para Next.js puro
3. VPS própria (DigitalOcean, Hetzner) com Docker — mais controle
4. Google Cloud Run — serverless, paga por uso

Qual prefere?
```

---

## Opção 1: Railway

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Criar projeto
railway init

# 4. Adicionar serviços (PostgreSQL + Redis)
railway add --plugin postgresql
railway add --plugin redis

# 5. Configurar variáveis de ambiente
railway variables set ANTHROPIC_API_KEY=sk-...
railway variables set INSTAGRAM_ACCESS_TOKEN=...
railway variables set WHATSAPP_ACCESS_TOKEN=...
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)

# 6. Deploy
railway up

# 7. Rodar migrations
railway run npx prisma migrate deploy
```

// turbo

---

## Opção 2: Vercel + Supabase

```bash
# Frontend: Vercel
npm install -g vercel
vercel --prod

# Banco: Supabase (PostgreSQL gerenciado)
# 1. Criar projeto em supabase.com
# 2. Copiar DATABASE_URL do painel
# 3. Adicionar nas env vars da Vercel

# Redis: Upstash (serverless Redis)
# 1. Criar database em upstash.com
# 2. Copiar REDIS_URL
```

---

## Opção 3: VPS + Docker

```bash
# No servidor (Ubuntu 22.04):

# 1. Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Clonar repositório
git clone https://github.com/seu-usuario/seu-projeto.git
cd seu-projeto

# 3. Configurar .env
cp .env.example .env
nano .env  # preencher todas as variáveis

# 4. Subir serviços
docker-compose -f docker-compose.prod.yml up -d

# 5. Migrations
docker-compose exec web npx prisma migrate deploy

# 6. Verificar
docker-compose ps
curl http://localhost:3000/api/health
```

Gere também a configuração de Nginx com SSL:

```nginx
# /etc/nginx/sites-available/seu-dominio.conf
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name seu-dominio.com;
    
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# SSL gratuito com Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

// turbo

---

## Passo Final — Verificação Pós-Deploy

```bash
# Testar endpoints críticos:
curl https://seu-dominio.com/api/health

# Verificar agentes:
curl -H "Authorization: Bearer SEU_TOKEN" \
  https://seu-dominio.com/api/agents/status

# Testar pipeline completo:
curl -X POST -H "Authorization: Bearer SEU_TOKEN" \
  https://seu-dominio.com/api/agents/run

# Monitorar logs:
docker-compose logs -f web  # ou railway logs / vercel logs
```

Checklist pós-deploy:
```
□ Dashboard acessível em https://seu-dominio.com
□ Login funcionando
□ Health check retornando 200
□ Primeiro pipeline executado com sucesso
□ Post de teste publicado no Instagram
□ Mensagem de teste enviada no WhatsApp
□ Cron jobs agendados (verificar no Railway/logs)
□ Alertas de erro configurados
```
