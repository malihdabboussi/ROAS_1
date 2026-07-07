#!/usr/bin/env bash
# Clear mission-worker (roas-platform) Root Directory so Railpack can build workspace deps.
# With root=apps/mission-worker the Docker/Railpack snapshot excludes packages/* and the build fails.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/scripts/roas/roas-secrets.env"
PROJECT_ID="${RAILWAY_PROJECT_ID:-76ae41c5-bd85-4bf1-9a2a-e099a8ea85dd}"
SERVICE_ID="${RAILWAY_MISSION_WORKER_SERVICE_ID:-aa4e945e-d7ad-4cc0-9301-09800a1709b8}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

export RAILWAY_TOKEN="$(grep '^RAILWAY_TOKEN=' "${ENV_FILE}" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
if [[ -z "${RAILWAY_TOKEN}" ]]; then
  echo "RAILWAY_TOKEN missing — clear Root Directory manually:" >&2
  echo "  Railway → roas-workers → roas-platform → Settings → Source → Root Directory → leave empty" >&2
  exit 1
fi

ENV_ID="$(curl -sS https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"query { project(id: \\\"${PROJECT_ID}\\\") { environments { edges { node { id name } } } } }\"}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['project']['environments']['edges'][0]['node']['id'])" 2>/dev/null || true)"

if [[ -z "${ENV_ID}" ]]; then
  ENV_ID="$(npx --yes @railway/cli@4 status --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['environments']['edges'][0]['node']['id'])")"
fi

RESULT="$(curl -sS https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { serviceInstanceUpdate(environmentId: \\\"${ENV_ID}\\\", serviceId: \\\"${SERVICE_ID}\\\", input: { rootDirectory: \\\"\\\" }) }\"}")"

if echo "${RESULT}" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('data',{}).get('serviceInstanceUpdate') else 1)" 2>/dev/null; then
  echo "Cleared roas-platform Root Directory (repo root build context)."
  exit 0
fi

echo "Could not clear Root Directory via API (token may be read-only)." >&2
echo "Manual step required before mission-worker can build:" >&2
echo "  Railway → roas-workers → roas-platform → Settings → Source → Root Directory → clear / empty" >&2
echo "  Config-as-code path must stay: /apps/mission-worker/railway.json" >&2
exit 1
