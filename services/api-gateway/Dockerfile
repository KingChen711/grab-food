# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile — api-gateway
# Build context: monorepo root (grab/)
# Usage: docker build -f services/api-gateway/Dockerfile -t grab/api-gateway .
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

# Copy workspace manifests (layer cache: only reinstall when manifests change)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/validators/package.json ./packages/validators/
COPY services/api-gateway/package.json ./services/api-gateway/

RUN pnpm install --frozen-lockfile

# ─── Stage 3: Builder ────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/validators/node_modules ./packages/validators/node_modules
COPY --from=deps /app/services/api-gateway/node_modules ./services/api-gateway/node_modules

# Copy root workspace manifests (needed for pnpm deploy)
COPY --from=deps /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./

# Copy source
COPY packages/config ./packages/config
COPY packages/types ./packages/types
COPY packages/validators ./packages/validators
COPY services/api-gateway ./services/api-gateway

# Build shared packages first, then the service
RUN pnpm --filter @grab/types build 2>/dev/null || true
RUN pnpm --filter @grab/validators build 2>/dev/null || true
RUN pnpm --filter @grab/api-gateway build

# ─── Stage 4: Deploy (prune to production deps only) ─────────────────────────
FROM base AS deploy
WORKDIR /app

COPY --from=builder /app .
RUN pnpm --filter @grab/api-gateway deploy --legacy --prod /deploy/api-gateway

# ─── Stage 5: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init wget
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy the pruned standalone deployment
COPY --from=deploy /deploy/api-gateway/node_modules ./node_modules
COPY --from=deploy /deploy/api-gateway/dist ./dist

# Run as non-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nestjs
USER nestjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
