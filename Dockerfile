# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependências para compilar pacotes nativos (se necessário)
RUN apk add --no-cache libc6-compat python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev libjpeg-turbo-dev giflib-dev canvas-dev

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Gerar cliente Prisma
RUN npx prisma generate

# Build Next.js
RUN npm run build

# --- Stage 2: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Instalar FFmpeg e dependências de runtime para canvas/sharp
RUN apk add --no-cache ffmpeg pixman cairo pango libjpeg-turbo giflib

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
