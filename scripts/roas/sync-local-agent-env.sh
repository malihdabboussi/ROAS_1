#!/usr/bin/env bash
# Sync ROAS local env files from scripts/roas/roas-secrets.env.
# Aligns apps/agent-api/.env and, when present, apps/api/.env + root .env so
# agents never silently use legacy Vibey prod (qfrvykscoymiwwgysvsr).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SECRETS_FILE="${ROOT}/scripts/roas/roas-secrets.env"
AGENT_ENV="${ROOT}/apps/agent-api/.env"
API_ENV="${ROOT}/apps/api/.env"
ROOT_ENV="${ROOT}/.env"
WEB_ENV="${ROOT}/apps/web/.env.local"

if [[ ! -f "${SECRETS_FILE}" ]]; then
  echo "Missing ${SECRETS_FILE}" >&2
  exit 1
fi
if [[ ! -f "${AGENT_ENV}" ]]; then
  echo "Missing ${AGENT_ENV} — copy from apps/agent-api/.env.example first" >&2
  exit 1
fi

python3 - "${SECRETS_FILE}" "${AGENT_ENV}" "${WEB_ENV}" "${API_ENV}" "${ROOT_ENV}" <<'PY'
import sys
from pathlib import Path

secrets_path, agent_path, web_path, api_path, root_env_path = map(Path, sys.argv[1:6])

def parse_env(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue
        key, value = stripped.split('=', 1)
        data[key.strip()] = value.strip().strip('"')
    return data

def write_env(path: Path, updates: dict[str, str]) -> list[str]:
    lines = path.read_text().splitlines()
    seen: set[str] = set()
    out: list[str] = []
    changed: list[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('#') and '=' in stripped:
            key = stripped.split('=', 1)[0].strip()
            if key in updates:
                seen.add(key)
                new_line = f"{key}={updates[key]}"
                if line != new_line:
                    changed.append(key)
                out.append(new_line)
                continue
        out.append(line)

    for key, value in updates.items():
        if key not in seen:
            out.append(f"{key}={value}")
            changed.append(key)

    path.write_text('\n'.join(out) + '\n')
    return changed

secrets = parse_env(secrets_path)
web = parse_env(web_path) if web_path.exists() else {}

# Prefer explicit ROAS secrets; fall back to web public vars for URL/anon.
updates = {
    'SUPABASE_URL': secrets.get('SUPABASE_URL') or web.get('NEXT_PUBLIC_SUPABASE_URL', ''),
    'SUPABASE_ANON_KEY': secrets.get('SUPABASE_ANON_KEY') or web.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
    'SUPABASE_SERVICE_ROLE_KEY': secrets.get('SUPABASE_SERVICE_ROLE_KEY', ''),
    'VAULT_ENCRYPTION_KEY': secrets.get('VAULT_ENCRYPTION_KEY', ''),
    'INTERNAL_API_TOKEN': secrets.get('INTERNAL_API_TOKEN', ''),
}

missing = [k for k, v in updates.items() if not v]
if missing:
    print('Missing required values in roas-secrets.env:', ', '.join(missing), file=sys.stderr)
    sys.exit(1)

changed = write_env(agent_path, updates)
if changed:
    print('Updated apps/agent-api/.env:', ', '.join(changed))
else:
    print('apps/agent-api/.env already aligned with roas-secrets.env')

# Same Supabase + vault keys for Nest API / root env landmines.
api_updates = {
    'SUPABASE_URL': updates['SUPABASE_URL'],
    'SUPABASE_ANON_KEY': updates['SUPABASE_ANON_KEY'],
    'SUPABASE_SERVICE_ROLE_KEY': updates['SUPABASE_SERVICE_ROLE_KEY'],
    'VAULT_ENCRYPTION_KEY': updates['VAULT_ENCRYPTION_KEY'],
    'INTERNAL_API_TOKEN': updates['INTERNAL_API_TOKEN'],
}

for path, label in ((api_path, 'apps/api/.env'), (root_env_path, 'root .env')):
    if not path.exists():
        print(f'Skip {label} (missing)')
        continue
    changed = write_env(path, api_updates)
    if changed:
        print(f'Updated {label}:', ', '.join(changed))
    else:
        print(f'{label} already aligned with roas-secrets.env')
PY

bash "${ROOT}/scripts/roas/verify-local-env-alignment.sh"
