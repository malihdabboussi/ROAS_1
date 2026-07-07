#!/bin/bash
set -euo pipefail

ROOT="$(cd ../.. && pwd)"
WEB_ROOT="${ROOT}/apps/web"

cd "${ROOT}"
npx pnpm@9 \
  --filter=@vibey/agent-policy \
  --filter=@vibey/api-shared \
  --filter=@vibey/context-breakdown \
  run build

cd "${WEB_ROOT}"
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192"
export NEXT_TELEMETRY_DISABLED=1
export NEXT_BUILD_WORKERS="${NEXT_BUILD_WORKERS:-1}"

npx next build --webpack
