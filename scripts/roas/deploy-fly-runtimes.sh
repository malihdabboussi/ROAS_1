#!/usr/bin/env bash
# Create (if needed) and deploy ROAS Fly runtimes (agent-api + OpenClaw).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/scripts/roas/roas-secrets.env"
APP="${FLY_APP:-roas-runtimes}"
ORG="${FLY_ORG:-personal}"
FLY="${FLY:-${HOME}/.fly/bin/flyctl}"
CONFIG="${ROOT}/docker/fly.roas.runtime.toml"

export FLY_ACCESS_TOKEN="$(grep '^FLY_API_TOKEN=' "${ENV_FILE}" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
if [[ -z "${FLY_ACCESS_TOKEN}" ]]; then
  echo "FLY_API_TOKEN missing in ${ENV_FILE}" >&2
  exit 1
fi

if ! "${FLY}" apps list --org "${ORG}" 2>/dev/null | rg -q "${APP}"; then
  echo "Creating Fly app ${APP} in org ${ORG}"
  "${FLY}" apps create "${APP}" --org "${ORG}"
fi

bash "${ROOT}/scripts/roas/apply-fly-secrets.sh"

cd "${ROOT}"
echo "Deploying ${APP} (this may take several minutes)..."
"${FLY}" deploy \
  --app "${APP}" \
  --config "${CONFIG}" \
  --dockerfile docker/Dockerfile \
  --strategy immediate

echo "Health check:"
curl -sS "https://${APP}.fly.dev/api/health" | head -c 400
echo
