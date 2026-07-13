#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT}"

PATTERN='govibey\.com|vibey\.im|vibeyfunnels\.com|vibeyv2-production|vibey-runtimes|qfrvykscoymiwwgysvsr|sweraoyotxgojtjrgcon|kksllhimdhtrszhaxxfy'

if rg -n -i "${PATTERN}" \
  apps/api/src \
  apps/agent-api/src \
  apps/funnels/src \
  apps/web/src \
  apps/admin/src \
  apps/openclaw/src \
  workers/apps-proxy \
  --glob '!**/*.test.ts' \
  --glob '!**/*.test.tsx' \
  --glob '!**/*.e2e.test.ts' \
  --glob '!**/*.spec.ts' \
  --glob '!**/__tests__/**' \
  --glob '!**/evals/**' \
  --glob '!**/*.md'; then
  echo 'Legacy Vibey runtime references detected in active ROAS surfaces.' >&2
  exit 1
fi

echo 'PASS: no blocked legacy Vibey runtime references in active ROAS surfaces.'
