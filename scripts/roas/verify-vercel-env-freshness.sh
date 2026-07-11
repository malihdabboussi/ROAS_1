#!/usr/bin/env bash
# Phase 4 guardrail: verify critical env vars were set BEFORE the current
# production build. Vercel bakes env vars at build time, so adding a var
# without redeploying leaves production running without it. This caught us
# twice (FLY_RUNTIME_APP on roas-api, WORKER_SECRET on roas-web).
#
# Exit 0 = every checked var predates the current production deployment.
# Exit 1 = a var was added/changed after the build (redeploy needed) or lookup failed.
#
# Usage: bash scripts/roas/verify-vercel-env-freshness.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/scripts/roas/roas-secrets.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

VERCEL_TOKEN="$(grep '^VERCEL_TOKEN=' "${ENV_FILE}" | head -1 | cut -d= -f2-)"
VERCEL_TEAM_ID="$(grep '^VERCEL_TEAM_ID=' "${ENV_FILE}" | head -1 | cut -d= -f2-)"

if [[ -z "${VERCEL_TOKEN}" || -z "${VERCEL_TEAM_ID}" ]]; then
  echo "VERCEL_TOKEN / VERCEL_TEAM_ID missing in ${ENV_FILE}" >&2
  exit 1
fi

# project_id:VAR[,VAR...] — critical production vars baked at build time.
CHECKS=(
  "roas-api:prj_YwUti53Q9vB6rMKPB5cpW8w7h0qL:FLY_RUNTIME_APP,APPS_DOMAIN_SUFFIX"
  "roas-web:prj_MTRba5SdYBFbiymrKqieGnGPjcBh:WORKER_SECRET"
)

export VERCEL_TOKEN VERCEL_TEAM_ID

fail=0
for entry in "${CHECKS[@]}"; do
  name="${entry%%:*}"
  rest="${entry#*:}"
  pid="${rest%%:*}"
  vars="${rest##*:}"
  PROJECT_NAME="${name}" PROJECT_ID="${pid}" VARS="${vars}" python3 - <<'PY' || fail=1
import json
import os
import sys
import urllib.request

token = os.environ["VERCEL_TOKEN"]
team = os.environ["VERCEL_TEAM_ID"]
name = os.environ["PROJECT_NAME"]
pid = os.environ["PROJECT_ID"]
wanted = [v for v in os.environ["VARS"].split(",") if v]


def api(path):
    req = urllib.request.Request(
        f"https://api.vercel.com{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


try:
    deps = api(f"/v6/deployments?projectId={pid}&teamId={team}&target=production&limit=1")["deployments"]
    if not deps:
        print(f"FAIL  {name}: no production deployment found")
        sys.exit(1)
    build_ms = deps[0].get("createdAt") or deps[0].get("created")
    envs = api(f"/v9/projects/{pid}/env?teamId={team}").get("envs", [])
    by_key = {}
    for e in envs:
        if "production" in (e.get("target") or []):
            by_key.setdefault(e["key"], e)
    problems = []
    for key in wanted:
        e = by_key.get(key)
        if not e:
            problems.append(f"{key}: MISSING on production target")
            continue
        upd = e.get("updatedAt") or e.get("createdAt") or 0
        if upd > build_ms:
            problems.append(f"{key}: set AFTER current build (redeploy needed)")
    if problems:
        print(f"FAIL  {name}: " + "; ".join(problems))
        sys.exit(1)
    print(f"PASS  {name}: {', '.join(wanted)} baked into current production build")
except Exception as exc:  # noqa: BLE001 - surface any lookup failure as drift
    print(f"FAIL  {name}: {exc}")
    sys.exit(1)
PY
done

echo
if [[ "${fail}" -ne 0 ]]; then
  echo "Result: env freshness FAILED — redeploy the flagged project(s) after setting the var."
  exit 1
fi
echo "Result: all checked env vars predate their current production build."
