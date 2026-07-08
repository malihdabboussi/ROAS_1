#!/usr/bin/env bash
# Run ROAS SQL against roas-production via Supabase Management API
# (same surface Supabase MCP execute_sql / apply_migration uses).
#
# Requires: Supabase CLI logged in (`supabase login`) on macOS keychain.
#
# Usage:
#   ./scripts/roas/apply-via-supabase-api.sh scripts/roas/roas-drift-recovery.sql
#   ./scripts/roas/apply-via-supabase-api.sh scripts/roas/roas-social-scheduling-complete.sql
#   ROAS_PROJECT_REF=lhfgtsjetcardinpgouq ./scripts/roas/apply-via-supabase-api.sh path/to/file.sql

set -euo pipefail

PROJECT_REF="${ROAS_PROJECT_REF:-lhfgtsjetcardinpgouq}"
API_BASE="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"

get_supabase_access_token() {
  local raw
  raw="$(security find-generic-password -s "Supabase CLI" -a "supabase" -w 2>/dev/null)" || {
    echo "Supabase CLI access token not found. Run: supabase login" >&2
    return 1
  }
  if [[ "$raw" == go-keyring-base64:* ]]; then
    printf '%s' "${raw#go-keyring-base64:}" | base64 -d
  else
    printf '%s' "$raw"
  fi
}

run_sql_file() {
  local file="$1"
  local token payload response
  if [[ ! -f "$file" ]]; then
    echo "Missing file: $file" >&2
    return 1
  fi
  token="$(get_supabase_access_token)"
  payload="$(jq -n --rawfile query "$file" '{query: $query}')"
  response="$(curl -sS -X POST "$API_BASE" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$payload")"
  if echo "$response" | jq -e '.message' >/dev/null 2>&1; then
    echo "ERROR $file -> $(echo "$response" | jq -r '.message')" >&2
    return 1
  fi
  echo "OK   $file"
  if [[ -n "$response" && "$response" != "[]" && "$response" != "null" ]]; then
    echo "$response" | jq -c '.' 2>/dev/null || echo "$response"
  fi
}

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <sql-file> [sql-file...]" >&2
  exit 1
fi

for file in "$@"; do
  run_sql_file "$file"
done

echo "== done via Supabase Management API (${PROJECT_REF}) =="
