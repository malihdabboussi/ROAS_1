#!/usr/bin/env bash
# Poll ROAS Vercel deployment status via API (reads scripts/roas/roas-secrets.env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/scripts/roas/roas-secrets.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

VERCEL_TOKEN="$(grep '^VERCEL_TOKEN=' "${ENV_FILE}" | head -1 | cut -d= -f2-)"
VERCEL_TEAM_ID="$(grep '^VERCEL_TEAM_ID=' "${ENV_FILE}" | head -1 | cut -d= -f2-)"

declare -A PROJECTS=(
  [roas-api]=prj_YwUti53Q9vB6rMKPB5cpW8w7h0qL
  [roas-web]=prj_MTRba5SdYBFbiymrKqieGnGPjcBh
  [roas-funnels]=prj_QPESSHik40T2659GTyfZSOalJe4T
)

for name in roas-api roas-web roas-funnels; do
  pid="${PROJECTS[$name]}"
  curl -sS -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "https://api.vercel.com/v6/deployments?projectId=${pid}&teamId=${VERCEL_TEAM_ID}&limit=1" | \
    python3 -c "
import json,sys
name='${name}'
d=json.load(sys.stdin)['deployments'][0]
meta=d.get('meta',{}) or {}
sha=(meta.get('githubCommitSha') or '')[:8]
print(f\"{name}: {d.get('readyState')} commit={sha} error={d.get('errorMessage') or '-'} url={d.get('url')}\")
"
done

if [[ "${1:-}" == "--logs" && -n "${2:-}" ]]; then
  project="${2}"
  pid="${PROJECTS[$project]:-}"
  if [[ -z "${pid}" ]]; then
    echo "Unknown project: ${project}" >&2
    exit 1
  fi
  deploy_id="$(curl -sS -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "https://api.vercel.com/v6/deployments?projectId=${pid}&teamId=${VERCEL_TEAM_ID}&limit=1" | \
    python3 -c "import json,sys; print(json.load(sys.stdin)['deployments'][0]['uid'])")"
  npx --yes vercel@41 inspect "${deploy_id}" --logs --token="${VERCEL_TOKEN}" --scope=roas-e3db7506
fi
