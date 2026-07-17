#!/usr/bin/env bash
# ROAS post-deploy smoke checks (Vercel + optional Fly/Railway).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_URL="${API_URL:-https://api.roas.io}"
WEB_URL="${WEB_URL:-https://app.roas.io}"
FUNNELS_URL="${FUNNELS_URL:-https://sites.roas.io}"
FLY_HEALTH_URL="${FLY_HEALTH_URL:-https://roas-runtimes.fly.dev/api/health/deep}"

pass=0
fail=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "PASS  ${name}"
    pass=$((pass + 1))
  else
    echo "FAIL  ${name}"
    fail=$((fail + 1))
  fi
}

check_http() {
  local url="$1"
  local expect_code="${2:-200}"
  local code
  code="$(curl -sS -o /tmp/roas-smoke-body.txt -w '%{http_code}' "$url" || echo 000)"
  if [[ "$code" == "$expect_code" ]]; then
    head -c 200 /tmp/roas-smoke-body.txt | tr -d '\n'
    echo
    return 0
  fi
  echo "expected HTTP ${expect_code}, got ${code}"
  head -c 200 /tmp/roas-smoke-body.txt | tr -d '\n'
  echo
  return 1
}

check_http_up() {
  # Healthy = app is up and routing: any 2xx or 3xx (redirect to /login,
  # marketing, etc.). Only connection failures / 4xx / 5xx fail.
  local url="$1"
  local code
  code="$(curl -sS -o /tmp/roas-smoke-body.txt -w '%{http_code}' "$url" || echo 000)"
  if [[ "$code" =~ ^[23][0-9][0-9]$ ]]; then
    echo "HTTP ${code}"
    return 0
  fi
  echo "expected 2xx/3xx, got ${code}"
  head -c 200 /tmp/roas-smoke-body.txt | tr -d '\n'
  echo
  return 1
}

check_json_ok() {
  local url="$1"
  local timeout="${2:-45}"
  python3 - "$url" "$timeout" <<'PY'
import json, sys, urllib.request
url, timeout = sys.argv[1], int(sys.argv[2])
try:
    with urllib.request.urlopen(url, timeout=timeout) as r:
        body = json.load(r)
    ok = body.get("status") == "ok"
    print(json.dumps(body)[:200])
    sys.exit(0 if ok else 1)
except Exception as e:
    print(e)
    sys.exit(1)
PY
}

echo "=== ROAS smoke deploy ==="
echo "api:     ${API_URL}"
echo "web:     ${WEB_URL}"
echo "funnels: ${FUNNELS_URL}"
echo

check "api.roas.io GET /api" check_json_ok "${API_URL}/api"
check "app.roas.io GET /" check_http_up "${WEB_URL}/"
check "sites.roas.io GET /" check_http_up "${FUNNELS_URL}/"

if [[ "${SMOKE_FLY:-0}" == "1" ]]; then
  check "roas-runtimes Fly readiness" check_json_ok "${FLY_HEALTH_URL}"
fi

# Phase 3: public agent proxy on agents.roas.io. Needs a real published slug.
if [[ -n "${AGENT_SLUG:-}" ]]; then
  check "agents.roas.io GET /${AGENT_SLUG}" check_http "https://${AGENT_SLUG}.agents.roas.io/" 200
fi

# Phase 4: env-freshness guard — confirm critical vars predate the current
# production build. Auto-runs when secrets + token are present (set SMOKE_ENV=0 to skip).
if [[ "${SMOKE_ENV:-1}" == "1" && -f "${ROOT}/scripts/roas/roas-secrets.env" ]]; then
  check "vercel env baked into prod build" bash "${ROOT}/scripts/roas/verify-vercel-env-freshness.sh"
fi

echo
echo "Result: ${pass} passed, ${fail} failed"
exit $(( fail > 0 ? 1 : 0 ))
