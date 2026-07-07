#!/usr/bin/env bash
# Poll ROAS Railway project via API token (reads scripts/roas/roas-secrets.env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/scripts/roas/roas-secrets.env"
PROJECT_ID="${RAILWAY_PROJECT_ID:-76ae41c5-bd85-4bf1-9a2a-e099a8ea85dd}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

export RAILWAY_TOKEN="$(grep '^RAILWAY_TOKEN=' "${ENV_FILE}" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
export RAILWAY_PROJECT_ID="${PROJECT_ID}"

if [[ -z "${RAILWAY_TOKEN}" ]]; then
  echo "RAILWAY_TOKEN missing in ${ENV_FILE} (section 4)" >&2
  exit 1
fi

RAILWAY="${RAILWAY:-npx}"

echo "=== Railway roas-workers (${PROJECT_ID}) ==="
${RAILWAY} --yes @railway/cli@4 status 2>&1 | rg -v 'npm warn|Railway agent tooling|Run `railway setup' || ${RAILWAY} --yes @railway/cli@4 status

if [[ "${1:-}" == "--logs" && -n "${2:-}" ]]; then
  echo
  echo "=== logs: ${2} ==="
  ${RAILWAY} --yes @railway/cli@4 logs --service "${2}" --lines 50
fi
