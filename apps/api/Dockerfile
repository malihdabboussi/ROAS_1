# ──────────────────────────────────────────────────────────────
# Vibey API — Docker Image (Railway deployment)
#
# NestJS backend running as a long-lived Node server.
# Build from monorepo root:
#   docker build -t vibey-api:latest -f apps/api/Dockerfile .
# ──────────────────────────────────────────────────────────────

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /build

# Copy workspace config first (cache layer)
COPY pnpm-workspace.yaml .npmrc pnpm-lock.yaml package.json ./
COPY patches/ patches/

# Copy package.json for dependency resolution
COPY packages/api-shared/package.json packages/api-shared/
COPY packages/agent-policy/package.json packages/agent-policy/
COPY apps/api/package.json apps/api/

# Install dependencies (cached unless lock/package.json change)
RUN pnpm install --no-frozen-lockfile --shamefully-hoist --filter @vibey/api --filter @vibey/api-shared --filter @vibey/agent-policy

# Copy source code
COPY packages/api-shared/ packages/api-shared/
COPY packages/agent-policy/ packages/agent-policy/
COPY apps/api/ apps/api/

# Build workspace deps first (api depends on them)
RUN pnpm --filter @vibey/api-shared build
RUN pnpm --filter @vibey/agent-policy build

# Build the NestJS API
RUN pnpm --filter @vibey/api build

# ── Stage 2: Production ────────────────────────────────────
FROM node:22-bookworm-slim

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy built artifacts
COPY --from=builder /build/apps/api/dist ./dist
COPY --from=builder /build/apps/api/package.json ./
COPY --from=builder /build/apps/api/public ./public

# Copy node_modules (hoisted) + workspace package runtime artifacts
COPY --from=builder /build/apps/api/node_modules ./node_modules
COPY --from=builder /build/node_modules /node_modules
COPY --from=builder /build/packages/api-shared/dist ./packages/api-shared/dist
COPY --from=builder /build/packages/api-shared/package.json ./packages/api-shared/
COPY --from=builder /build/packages/agent-policy/dist ./packages/agent-policy/dist
COPY --from=builder /build/packages/agent-policy/package.json ./packages/agent-policy/

# Symlink workspace packages so Node resolves @vibey/* imports
RUN mkdir -p node_modules/@vibey && \
    ln -sf /app/packages/api-shared node_modules/@vibey/api-shared && \
    ln -sf /app/packages/agent-policy node_modules/@vibey/agent-policy

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "--enable-source-maps", "dist/main"]
