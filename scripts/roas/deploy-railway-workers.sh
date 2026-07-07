#!/usr/bin/env bash
# Print Railway worker env block + optional CLI deploy when RAILWAY_TOKEN is set.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/scripts/roas/roas-secrets.env"
PROJECT_NAME="${RAILWAY_PROJECT:-roas-workers}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

echo "=== Railway section 10 (paste into mission-worker + queue-worker) ==="
python3 - "${ENV_FILE}" <<'PY'
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text().splitlines()
start = next(i for i, l in enumerate(text) if l.startswith('# 10. RAILWAY'))
end = next((i for i, l in enumerate(text[start:], start) if l.startswith('# 11. LOCAL')), len(text))
for line in text[start:end]:
    if line.startswith('#') or '=' in line:
        print(line)
PY

RAILWAY_TOKEN="$(grep -E '^RAILWAY_TOKEN=' "${ENV_FILE}" 2>/dev/null | head -1 | cut -d= -f2- || true)"
if [[ -z "${RAILWAY_TOKEN}" ]]; then
  echo
  echo "RAILWAY_TOKEN not in ${ENV_FILE} — manual steps:"
  echo "  1. Railway dashboard → project ${PROJECT_NAME}"
  echo "  2. New Service → GitHub repo dylanvanas1/roas-platform"
  echo "  3. mission-worker: root apps/mission-worker, Dockerfile apps/mission-worker/Dockerfile"
  echo "  4. queue-worker: root apps/queue-worker, builder RAILPACK (see apps/queue-worker/railway.json)"
  echo "  5. Paste section 10 vars into both services (REDIS_URL = internal Railway reference)"
  exit 0
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "Install Railway CLI: npm i -g @railway/cli" >&2
  exit 1
fi

export RAILWAY_TOKEN
echo
echo "Railway CLI detected — link services manually first, then set vars from section 10."
