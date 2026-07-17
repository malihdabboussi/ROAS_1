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

# BuildKit reads .dockerignore from the build context root; flyctl --ignorefile is ignored
# with Depot/BuildKit (superfly/flyctl#3870). Swap in the Fly-specific ignore file for deploy.
ROOT_DOCKERIGNORE="${ROOT}/.dockerignore"
FLY_DOCKERIGNORE="${ROOT}/docker/fly.dockerignore"
BACKUP_DOCKERIGNORE="$(mktemp)"
cp "${ROOT_DOCKERIGNORE}" "${BACKUP_DOCKERIGNORE}"
restore_dockerignore() {
  cp "${BACKUP_DOCKERIGNORE}" "${ROOT_DOCKERIGNORE}"
  rm -f "${BACKUP_DOCKERIGNORE}"
}
trap restore_dockerignore EXIT
cp "${FLY_DOCKERIGNORE}" "${ROOT_DOCKERIGNORE}"

echo "Deploying ${APP} (this may take several minutes)..."
"${FLY}" deploy \
  --app "${APP}" \
  --config "${CONFIG}" \
  --dockerfile docker/Dockerfile \
  --strategy immediate

echo "Readiness check:"
curl -fsS "https://${APP}.fly.dev/api/health/deep" | head -c 400
echo
