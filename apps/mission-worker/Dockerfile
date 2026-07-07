# ──────────────────────────────────────────────────────────────
# Vibey Mission Worker — Docker Image (Railway dashboard path)
#
# Canonical copy also at docker/mission-worker.Dockerfile — keep in sync.
# Requires monorepo root as Docker build context (empty Railway Root Directory).
# Build locally: docker build -t vibey-mission-worker:latest -f apps/mission-worker/Dockerfile .
# ──────────────────────────────────────────────────────────────

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /build

COPY pnpm-workspace.yaml .npmrc pnpm-lock.yaml package.json ./
COPY patches/ patches/

COPY packages/api-shared/package.json packages/api-shared/
COPY packages/context-breakdown/package.json packages/context-breakdown/
COPY apps/mission-worker/package.json apps/mission-worker/

RUN pnpm install --no-frozen-lockfile --shamefully-hoist --filter @vibey/mission-worker --filter @vibey/api-shared --filter @vibey/context-breakdown

COPY packages/api-shared/ packages/api-shared/
COPY packages/context-breakdown/ packages/context-breakdown/
COPY apps/mission-worker/ apps/mission-worker/

RUN pnpm --filter @vibey/context-breakdown build
RUN pnpm --filter @vibey/api-shared build
RUN pnpm --filter @vibey/mission-worker build

# ── Stage 2: Production ────────────────────────────────────
FROM node:22-bookworm-slim

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY --from=builder /build/apps/mission-worker/dist ./dist
COPY --from=builder /build/apps/mission-worker/package.json ./

COPY --from=builder /build/apps/mission-worker/node_modules ./node_modules
COPY --from=builder /build/node_modules /node_modules
COPY --from=builder /build/packages/api-shared/dist ./packages/api-shared/dist
COPY --from=builder /build/packages/api-shared/package.json ./packages/api-shared/
COPY --from=builder /build/packages/context-breakdown/dist ./packages/context-breakdown/dist
COPY --from=builder /build/packages/context-breakdown/package.json ./packages/context-breakdown/

RUN mkdir -p node_modules/@vibey && \
    ln -sf /app/packages/api-shared node_modules/@vibey/api-shared && \
    ln -sf /app/packages/context-breakdown node_modules/@vibey/context-breakdown

ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "dist/apps/mission-worker/src/main.js"]
