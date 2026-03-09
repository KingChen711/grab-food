# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile — promotion-service
# Build context: monorepo root (grab/)
# Usage: docker build -f services/promotion-service/Dockerfile -t grab/promotion-service .
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Base ───────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# ─── Stage 2: Dependencies ───────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/validators/package.json ./packages/validators/
COPY services/promotion-service/package.json ./services/promotion-service/

RUN pnpm install --frozen-lockfile

# ─── Stage 3: Builder ────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/validators/node_modules ./packages/validators/node_modules
COPY --from=deps /app/services/promotion-service/node_modules ./services/promotion-service/node_modules

COPY packages/config ./packages/config
COPY packages/types ./packages/types
COPY packages/validators ./packages/validators
COPY services/promotion-service ./services/promotion-service

RUN pnpm --filter @grab/types build 2>/dev/null || true
RUN pnpm --filter @grab/validators build 2>/dev/null || true
RUN pnpm --filter @grab/promotion-service build

# ─── Stage 4: Deploy (prune to production deps only) ─────────────────────────
FROM base AS deploy
WORKDIR /app

COPY --from=builder /app .
RUN pnpm --filter @grab/promotion-service deploy --legacy --prod /deploy/promotion-service

# ─── Stage 5: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init wget
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3009
ENV TCP_PORT=5009

COPY --from=deploy /deploy/promotion-service/node_modules ./node_modules
COPY --from=deploy /deploy/promotion-service/dist ./dist

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nestjs
USER nestjs

EXPOSE 3009 5009

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
