# ──────────────────────────────────────────────────────────────
# Vibey Mission Worker — Docker Image (local / repo-root Railway)
#
# Requires monorepo root as Docker build context (packages/* + apps/mission-worker).
# Railway roas-platform service must use empty Root Directory + docker/mission-worker.Dockerfile (see railway.json).
# Build from monorepo root:
#   docker build -t vibey-mission-worker:latest -f docker/mission-worker.Dockerfile .
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
COPY packages/context-breakdown/package.json packages/context-breakdown/
COPY apps/mission-worker/package.json apps/mission-worker/

# Install dependencies (cached unless lock/package.json change)
RUN pnpm install --no-frozen-lockfile --shamefully-hoist --filter @vibey/mission-worker --filter @vibey/api-shared --filter @vibey/context-breakdown

# Copy source code
COPY packages/api-shared/ packages/api-shared/
COPY packages/context-breakdown/ packages/context-breakdown/
COPY apps/mission-worker/ apps/mission-worker/

# Build workspace deps first (mission-worker depends on them)
RUN pnpm --filter @vibey/context-breakdown build
RUN pnpm --filter @vibey/api-shared build

# Build the mission-worker
RUN pnpm --filter @vibey/mission-worker build

# ── Stage 2: Production ────────────────────────────────────
FROM node:22-bookworm-slim

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy built artifacts
COPY --from=builder /build/apps/mission-worker/dist ./dist
COPY --from=builder /build/apps/mission-worker/package.json ./

# Copy node_modules (hoisted) + workspace package runtimes
COPY --from=builder /build/apps/mission-worker/node_modules ./node_modules
COPY --from=builder /build/node_modules /node_modules
COPY --from=builder /build/packages/api-shared/dist ./packages/api-shared/dist
COPY --from=builder /build/packages/api-shared/package.json ./packages/api-shared/
COPY --from=builder /build/packages/context-breakdown/dist ./packages/context-breakdown/dist
COPY --from=builder /build/packages/context-breakdown/package.json ./packages/context-breakdown/

# Symlink workspace packages so Node resolves @vibey/* imports
RUN mkdir -p node_modules/@vibey && \
    ln -sf /app/packages/api-shared node_modules/@vibey/api-shared && \
    ln -sf /app/packages/context-breakdown node_modules/@vibey/context-breakdown

ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "dist/apps/mission-worker/src/main.js"]
