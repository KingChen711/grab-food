# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile — analytics-service
# Build context: monorepo root (grab/)
# Usage: docker build -f services/analytics-service/Dockerfile -t grab/analytics-service .
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
COPY services/analytics-service/package.json ./services/analytics-service/

RUN pnpm install --frozen-lockfile

# ─── Stage 3: Builder ────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/validators/node_modules ./packages/validators/node_modules
COPY --from=deps /app/services/analytics-service/node_modules ./services/analytics-service/node_modules

COPY packages/config ./packages/config
COPY packages/types ./packages/types
COPY packages/validators ./packages/validators
COPY services/analytics-service ./services/analytics-service

RUN pnpm --filter @grab/types build 2>/dev/null || true
RUN pnpm --filter @grab/validators build 2>/dev/null || true
RUN pnpm --filter @grab/analytics-service build

# ─── Stage 4: Deploy (prune to production deps only) ─────────────────────────
FROM base AS deploy
WORKDIR /app

COPY --from=builder /app .
RUN pnpm --filter @grab/analytics-service deploy --legacy --prod /deploy/analytics-service

# ─── Stage 5: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init wget
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3008
ENV TCP_PORT=5008

COPY --from=deploy /deploy/analytics-service/node_modules ./node_modules
COPY --from=deploy /deploy/analytics-service/dist ./dist

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nestjs
USER nestjs

EXPOSE 3008 5008

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
