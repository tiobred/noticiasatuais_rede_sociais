# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Instalar dependências para compilação de módulos nativos
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci

# Stage 2: Builder
FROM node:20-slim AS builder
WORKDIR /app

# Instala dependências para o Prisma e processamento de imagem (canvas/sharp) durante o build
RUN apt-get update -y && apt-get install -y \
    openssl \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variável para o build não tentar acessar recursos externos ou banco
ENV NEXT_PUBLIC_BUILD_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação
RUN npm run build

# Stage 3: Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Instalar FFmpeg e dependências para canvas/sharp + openssl para o Prisma no runtime
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 nodejs
RUN useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Criar pastas public e tmp caso não existam
RUN mkdir -p ./.next/static && mkdir -p ./public && mkdir -p ./tmp

# Garantir permissões para o usuário nextjs
RUN chown -R nextjs:nodejs ./public ./tmp


# Copiar arquivos necessários do build standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar public apenas se existir (usando wildcard)
COPY --from=builder /app/public* ./public/

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# O Next.js standalone gera um server.js que inicia a aplicação
CMD ["node", "server.js"]
