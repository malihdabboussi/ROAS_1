#!/usr/bin/env bash
# Import section 9 vars from roas-secrets.env into Fly roas-runtimes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/scripts/roas/roas-secrets.env"
APP="${FLY_APP:-roas-runtimes}"
FLY="${FLY:-${HOME}/.fly/bin/flyctl}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

export FLY_ACCESS_TOKEN="$(grep '^FLY_API_TOKEN=' "${ENV_FILE}" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
if [[ -z "${FLY_ACCESS_TOKEN}" ]]; then
  echo "FLY_API_TOKEN missing in ${ENV_FILE}" >&2
  exit 1
fi

TMP="$(mktemp)"
trap 'rm -f "${TMP}"' EXIT

python3 - "${ENV_FILE}" "${TMP}" <<'PY'
import re, sys
from pathlib import Path

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
text = src.read_text().splitlines()
start = next(i for i, l in enumerate(text) if l.startswith('# 9. FLY'))
end = next(i for i, l in enumerate(text[start:], start) if l.startswith('# 10. RAILWAY'))
rows = []
for line in text[start:end]:
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, _, val = line.partition('=')
    key, val = key.strip(), val.strip()
    if not val:
        continue
    if val.startswith('"') and val.endswith('"'):
        val = val[1:-1]
    elif val.startswith("'") and val.endswith("'"):
        val = val[1:-1]
    if key == 'OPENCLAW_GATEWAY_URL':
        val = 'http://127.0.0.1:18789'
    rows.append(f'{key}={val}')
if not rows:
    sys.exit('No non-empty section 9 vars')
dst.write_text('\n'.join(rows) + '\n')
print(f'Prepared {len(rows)} Fly secrets')
PY

"${FLY}" secrets import --app "${APP}" < "${TMP}"
echo "Fly secrets imported for ${APP}"
