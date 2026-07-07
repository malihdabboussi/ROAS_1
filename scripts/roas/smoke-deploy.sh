#!/usr/bin/env bash
# ROAS post-deploy smoke checks (Vercel + optional Fly/Railway).
set -euo pipefail

API_URL="${API_URL:-https://api.roas.io}"
WEB_URL="${WEB_URL:-https://app.roas.io}"
FUNNELS_URL="${FUNNELS_URL:-https://sites.roas.io}"
FLY_HEALTH_URL="${FLY_HEALTH_URL:-https://roas-runtimes.fly.dev/api/health}"

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

check_json_ok() {
  local url="$1"
  python3 - "$url" <<'PY'
import json, sys, urllib.request
url = sys.argv[1]
try:
    with urllib.request.urlopen(url, timeout=20) as r:
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
check "app.roas.io GET /" check_http "${WEB_URL}/" 200
check "sites.roas.io GET /" check_http "${FUNNELS_URL}/" 200

if [[ "${SMOKE_FLY:-0}" == "1" ]]; then
  check "roas-runtimes Fly /api/health" check_json_ok "${FLY_HEALTH_URL}"
fi

echo
echo "Result: ${pass} passed, ${fail} failed"
exit $(( fail > 0 ? 1 : 0 ))
