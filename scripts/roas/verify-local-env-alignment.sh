#!/usr/bin/env bash
# Guardrail: local web + agent-api must share the same Supabase project and ROAS keys.
# Catches the hybrid-dev footgun where web uses ROAS auth but agent-api still points at Vibey dev.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SECRETS_FILE="${ROOT}/scripts/roas/roas-secrets.env"
WEB_ENV="${ROOT}/apps/web/.env.local"
AGENT_ENV="${ROOT}/apps/agent-api/.env"
BLOCKED_HOST="qfrvykscoymiwwgysvsr.supabase.co"

fail=0

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "FAIL  missing $1"
    fail=1
  fi
}

require_file "${WEB_ENV}"
require_file "${AGENT_ENV}"
require_file "${SECRETS_FILE}"
if [[ "${fail}" -ne 0 ]]; then
  exit 1
fi

python3 - "${WEB_ENV}" "${AGENT_ENV}" "${SECRETS_FILE}" "${BLOCKED_HOST}" <<'PY'
import sys
from pathlib import Path

web_path, agent_path, secrets_path, blocked_host = sys.argv[1:5]

def parse_env(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue
        key, value = stripped.split('=', 1)
        data[key.strip()] = value.strip().strip('"')
    return data

def host(url: str) -> str:
    return url.replace('https://', '').replace('http://', '').strip('/')

web = parse_env(Path(web_path))
agent = parse_env(Path(agent_path))
secrets = parse_env(Path(secrets_path))

web_url = web.get('NEXT_PUBLIC_SUPABASE_URL', '')
agent_url = agent.get('SUPABASE_URL', '')
canonical_url = secrets.get('SUPABASE_URL', '')

errors: list[str] = []

if not web_url:
    errors.append('apps/web/.env.local missing NEXT_PUBLIC_SUPABASE_URL')
if not agent_url:
    errors.append('apps/agent-api/.env missing SUPABASE_URL')
if web_url and agent_url and host(web_url) != host(agent_url):
    errors.append(
        f'Supabase host mismatch: web={host(web_url)} agent-api={host(agent_url)}'
    )
if canonical_url and web_url and host(web_url) != host(canonical_url):
    errors.append(
        f'web Supabase host != roas-secrets.env ({host(web_url)} vs {host(canonical_url)})'
    )
for label, url in [('web', web_url), ('agent-api', agent_url)]:
    if blocked_host in url:
        errors.append(f'{label} still points at blocked Vibey dev host {blocked_host}')

for key in ('SUPABASE_SERVICE_ROLE_KEY', 'VAULT_ENCRYPTION_KEY'):
    secret_val = secrets.get(key, '')
    agent_val = agent.get(key, '')
    if not agent_val:
        errors.append(f'apps/agent-api/.env missing {key}')
    elif secret_val and agent_val != secret_val:
        errors.append(f'apps/agent-api/.env {key} does not match roas-secrets.env')

if errors:
    print('FAIL  local env alignment')
    for err in errors:
        print(f'  - {err}')
    print('Fix: bash scripts/roas/sync-local-agent-env.sh')
    sys.exit(1)

print('PASS  local env alignment')
print(f'  supabase_host={host(web_url)}')
PY
