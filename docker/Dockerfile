# ──────────────────────────────────────────────────────────────
# Vibey Machine — Docker Image
#
# Contains: OpenClaw (forked, built from source) + agent-api + Vibey workspace
# Base: node:22-bookworm-slim
# Process manager: supervisord (runs OpenClaw gateway + agent-api; browser sidecar is manual)
#
# Build from monorepo root:
#   docker build -t vibey-machine:latest -f docker/Dockerfile .
#
# Override OpenClaw version:
#   docker build --build-arg OPENCLAW_REF=main -f docker/Dockerfile .
# ──────────────────────────────────────────────────────────────

# ── Stage 1: Build OpenClaw from local source ──────────────────
FROM node:22-bookworm AS openclaw-builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

WORKDIR /openclaw

COPY apps/openclaw/ .

ENV CI=true
RUN pnpm install --frozen-lockfile

RUN pnpm build

ENV OPENCLAW_PREFER_PNPM=1
RUN pnpm ui:build

# Drop devDependencies from node_modules now that the build is complete.
# Tooling (typescript, tsdown, rolldown, vitest, oxlint, lit, etc.) is no longer needed;
# only `dependencies` are imported at runtime. Saves ~150–300 MB in the final image.
RUN pnpm install --frozen-lockfile --prod

# ── Stage 2: Build agent-api ──────────────────────────────────
FROM node:22-bookworm-slim AS api-builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /build

# Copy workspace config first (cache layer)
COPY pnpm-workspace.yaml .npmrc pnpm-lock.yaml package.json ./
COPY patches/ patches/

# Copy package.json for all workspace packages (dependency resolution)
COPY packages/api-shared/package.json packages/api-shared/
COPY packages/agent-policy/package.json packages/agent-policy/
COPY packages/context-breakdown/package.json packages/context-breakdown/
COPY apps/agent-api/package.json apps/agent-api/
COPY patches/ patches/

# Install dependencies (cached unless lock/package.json change)
# --shamefully-hoist: flatten deps to root node_modules so the Docker COPY works
RUN pnpm install --frozen-lockfile --shamefully-hoist --filter @vibey/agent-api --filter @vibey/api-shared --filter @vibey/agent-policy --filter @vibey/context-breakdown

# Copy source code
COPY packages/api-shared/ packages/api-shared/
COPY packages/agent-policy/ packages/agent-policy/
COPY packages/context-breakdown/ packages/context-breakdown/
COPY apps/agent-api/ apps/agent-api/

# Build workspace deps first (agent-api depends on them)
RUN pnpm --filter @vibey/api-shared build
RUN pnpm --filter @vibey/agent-policy build
RUN pnpm --filter @vibey/context-breakdown build

# Build agent-api
RUN pnpm --filter @vibey/agent-api build

# Copy fonts for PDF generation (Noto Latin + Hebrew + Ubuntu fallback)
RUN mkdir -p /build/apps/agent-api/dist/fonts
COPY docker/fonts/NotoSans-Regular.ttf /build/apps/agent-api/dist/fonts/NotoSans-Regular.ttf
COPY docker/fonts/NotoSans-Bold.ttf /build/apps/agent-api/dist/fonts/NotoSans-Bold.ttf
COPY docker/fonts/NotoSansHebrew-Regular.ttf /build/apps/agent-api/dist/fonts/NotoSansHebrew-Regular.ttf
COPY docker/fonts/NotoSansHebrew-Bold.ttf /build/apps/agent-api/dist/fonts/NotoSansHebrew-Bold.ttf
COPY docker/fonts/Ubuntu-R.ttf /build/apps/agent-api/dist/fonts/Ubuntu-R.ttf
COPY docker/fonts/Ubuntu-B.ttf /build/apps/agent-api/dist/fonts/Ubuntu-B.ttf

# ── Stage 2b: Pre-install user project template deps ──────────
FROM node:22-bookworm-slim AS template-builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /template
COPY docker/project-template/package.json .
RUN pnpm install --prefer-offline

# ── Stage 3: Production image ─────────────────────────────────
FROM node:22-bookworm-slim

USER root

# Install supervisord, ffmpeg, yt-dlp, and browser sidecar dependencies for manual start
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      supervisor \
      ffmpeg \
      curl \
      ca-certificates \
      chromium \
      xvfb \
      squid && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9 --activate

# Create node user directories
RUN mkdir -p /home/node/.openclaw && chown -R node:node /home/node

# ── Copy built OpenClaw ────────────────────────────────────────
COPY --from=openclaw-builder --chown=node:node /openclaw/dist /app/dist
COPY --from=openclaw-builder --chown=node:node /openclaw/node_modules /app/node_modules
COPY --from=openclaw-builder /openclaw/package.json /app/
COPY --from=openclaw-builder /openclaw/openclaw.mjs /app/
COPY --from=openclaw-builder /openclaw/docs/reference/templates /app/docs/reference/templates

# ── Copy built agent-api ──────────────────────────────────────
COPY --from=api-builder --chown=node:node /build/apps/agent-api/dist /app/agent-api/dist
COPY --from=api-builder --chown=node:node /build/apps/agent-api/package.json /app/agent-api/
# Copy agent-api node_modules (symlinks) + pnpm virtual store.
# pnpm links packages from apps/agent-api/node_modules into the workspace store at /node_modules/.pnpm.
# We copy the API builder store to /node_modules/.pnpm so the symlinks resolve correctly at runtime.
COPY --from=api-builder --chown=node:node /build/apps/agent-api/node_modules /app/agent-api/node_modules
COPY --from=api-builder /build/node_modules /node_modules
# api-shared + agent-policy + context-breakdown dist needed at runtime (imported by agent-api)
COPY --from=api-builder --chown=node:node /build/packages/api-shared/dist /app/packages/api-shared/dist
COPY --from=api-builder --chown=node:node /build/packages/api-shared/package.json /app/packages/api-shared/
COPY --from=api-builder --chown=node:node /build/packages/agent-policy/dist /app/packages/agent-policy/dist
COPY --from=api-builder --chown=node:node /build/packages/agent-policy/package.json /app/packages/agent-policy/
COPY --from=api-builder --chown=node:node /build/packages/context-breakdown/dist /app/packages/context-breakdown/dist
COPY --from=api-builder --chown=node:node /build/packages/context-breakdown/package.json /app/packages/context-breakdown/

# Symlink workspace packages so Node can resolve @vibey/* imports
RUN mkdir -p /app/agent-api/node_modules/@vibey && \
    ln -sf /app/packages/api-shared /app/agent-api/node_modules/@vibey/api-shared && \
    ln -sf /app/packages/agent-policy /app/agent-api/node_modules/@vibey/agent-policy && \
    ln -sf /app/packages/context-breakdown /app/agent-api/node_modules/@vibey/context-breakdown

# ── Seed Node compile cache for faster stopped-machine restarts ──
COPY --chown=node:node docker/enable-node-compile-cache.mjs /app/enable-node-compile-cache.mjs
COPY --chown=node:node docker/prewarm-node-compile-cache.mjs /app/prewarm-node-compile-cache.mjs
RUN mkdir -p /app/.node-compile-cache/openclaw /app/.node-compile-cache/agent-api && \
    NODE_COMPILE_CACHE=/app/.node-compile-cache/openclaw node /app/prewarm-node-compile-cache.mjs openclaw && \
    NODE_PATH=/app/agent-api/node_modules NODE_COMPILE_CACHE=/app/.node-compile-cache/agent-api node /app/prewarm-node-compile-cache.mjs agent-api && \
    chown -R node:node /app/.node-compile-cache

# ── Copy OpenClaw config (Vibey only) ─────────────────────────
COPY --chown=node:node docker/openclaw.json /home/node/.openclaw/openclaw.json

# ── Copy agent workspaces (read-only consciousness + skills) ──
# Core system agents are pre-seeded; org/custom agents are created by AgentSyncService at boot.
COPY --chown=node:node docker/agents/vibey /app/agents/vibey
COPY --chown=node:node docker/agents/templates/hr /app/agents/hr
COPY --chown=node:node docker/agents/atlas /app/agents/atlas

# ── Copy custom tool plugin ───────────────────────────────────
COPY --chown=node:node docker/tools/vibey-backend /home/node/.openclaw/extensions/vibey-backend

# Keep plugin path explicit for container runtime config substitution.
ENV VIBEY_PLUGIN_PATH=/home/node/.openclaw/extensions/vibey-backend
ENV MEMORY_CORE_PLUGIN_PATH=/home/node/.openclaw/extensions/memory-core
ENV OPENCLAW_CONFIG_PATH=/home/node/.openclaw/openclaw.json
ENV AGENTS_BASE_DIR=/app/agents

# ── Copy memory-core plugin (OpenClaw default slot requires it) ──
COPY --from=openclaw-builder --chown=node:node /openclaw/extensions/memory-core /home/node/.openclaw/extensions/memory-core

# Fail the image build when the baked config references a plugin that is not
# present in the final runtime image. `config get` is read-only and runs the
# same plugin-aware validation gate used before the gateway starts.
RUN node /app/openclaw.mjs config get gateway.port > /dev/null

# ── Copy agent-api startup script ─────────────────────────────
COPY --chown=node:node docker/start-agent-api.sh /app/agent-api/start.sh
RUN chmod +x /app/agent-api/start.sh

# ── Browser sidecar assets: Squid + Chromium (manual start, loopback CDP) ──
COPY docker/squid-instagram.conf /etc/squid/squid-instagram.conf
COPY docker/vibey-browser-sidecar.sh /usr/local/bin/vibey-browser-sidecar.sh
RUN chmod +x /usr/local/bin/vibey-browser-sidecar.sh && \
    mkdir -p /var/spool/squid && chown proxy:proxy /var/spool/squid

# ── Copy supervisord config ───────────────────────────────────
COPY docker/supervisord.conf /etc/supervisor/conf.d/vibey.conf

# ── Copy Vibey SDK (local package for user apps) ──────────────
COPY --chown=node:node packages/vibey-sdk /app/packages/vibey-sdk
RUN mkdir -p /app/agent-api/node_modules/@vibey && \
    ln -sf /app/packages/vibey-sdk /app/agent-api/node_modules/@vibey/sdk

# ── Create user-projects directory ────────────────────────────
RUN mkdir -p /app/user-projects && chown node:node /app/user-projects

# ── PreWarm scratch tree (agent-api runs as node; must be writable) ──
RUN mkdir -p /app/template-warm && chown -R node:node /app/template-warm

# ── Copy pre-warmed project template (node_modules for instant starts) ──
COPY --from=template-builder --chown=node:node /template/node_modules /app/project-template/node_modules
COPY --chown=node:node docker/project-template/package.json /app/project-template/package.json

# ── Fix ownership on the few dirs created by mkdir as root ────
# (All COPYs above use --chown=node:node to avoid a duplicate 693 MB layer.)
RUN chown node:node /app/agent-api/node_modules/@vibey

# Expose agent-api port (only externally accessible port)
EXPOSE 3003

CMD ["supervisord", "-n", "-c", "/etc/supervisor/conf.d/vibey.conf"]
