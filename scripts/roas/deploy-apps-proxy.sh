#!/usr/bin/env bash
# Deploy ROAS Cloudflare apps-proxy worker (public agents + published apps).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/scripts/roas/roas-secrets.env"
WORKER_DIR="${ROOT}/workers/apps-proxy"
CONFIG="${WORKER_DIR}/wrangler.roas.toml"

if [[ ! -f "${CONFIG}" ]]; then
  echo "Missing ${CONFIG}" >&2
  exit 1
fi

if rg -q 'REPLACE_WITH_ROAS_KV_NAMESPACE_ID' "${CONFIG}"; then
  echo "Edit workers/apps-proxy/wrangler.roas.toml:" >&2
  echo "  - set account_id to your ROAS Cloudflare account" >&2
  echo "  - create KV namespace and set SLUG_CACHE id" >&2
  exit 1
fi

if command -v wrangler >/dev/null 2>&1; then
  WRANGLER=(wrangler)
else
  WRANGLER=(npx --yes wrangler)
fi

if [[ -f "${ENV_FILE}" ]]; then
  SUPABASE_URL="$(grep '^SUPABASE_URL=' "${ENV_FILE}" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
  SUPABASE_SERVICE_ROLE_KEY="$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "${ENV_FILE}" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
  INTERNAL_API_TOKEN="$(grep '^INTERNAL_API_TOKEN=' "${ENV_FILE}" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
  WORKER_SECRET="$(grep '^WORKER_SECRET=' "${ENV_FILE}" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"

  for name in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY INTERNAL_API_TOKEN WORKER_SECRET; do
    if [[ -z "${!name:-}" ]]; then
      echo "${name} missing in ${ENV_FILE}" >&2
      exit 1
    fi
  done

  cd "${WORKER_DIR}"
  printf '%s' "${SUPABASE_URL}" | "${WRANGLER[@]}" secret put SUPABASE_URL --config wrangler.roas.toml
  printf '%s' "${SUPABASE_SERVICE_ROLE_KEY}" | "${WRANGLER[@]}" secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.roas.toml
  printf '%s' "${INTERNAL_API_TOKEN}" | "${WRANGLER[@]}" secret put INTERNAL_API_TOKEN --config wrangler.roas.toml
  printf '%s' "${WORKER_SECRET}" | "${WRANGLER[@]}" secret put WORKER_SECRET --config wrangler.roas.toml
else
  echo "No ${ENV_FILE}; ensure worker secrets are set in Cloudflare dashboard" >&2
  cd "${WORKER_DIR}"
fi

"${WRANGLER[@]}" deploy --config wrangler.roas.toml
echo "Deployed roas-apps-proxy. DNS required on roas.io zone:"
echo "  *.agents.roas.io/* → worker routes (wrangler routes)"
echo "  *-app.roas.io remains intentionally dormant until published apps ship"
