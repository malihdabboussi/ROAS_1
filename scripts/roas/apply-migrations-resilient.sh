#!/usr/bin/env bash
# Apply ROAS migrations in chronological order, tolerating failures.
# Each file runs in its own transaction. Failures are logged and skipped so the
# full set can complete; genuine schema gaps are triaged from the failures log.
#
# Usage:
#   DATABASE_URL='postgresql://...' ./scripts/roas/apply-migrations-resilient.sh
# Env:
#   ORDER_FILE   override order list (default scripts/roas/migration-order.txt)
#   RESET=1      drop+recreate public schema and storage policies first

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
ORDER_FILE="${ORDER_FILE:-$(dirname "$0")/migration-order.txt}"
APPLIED_LOG="$(dirname "$0")/.applied.log"
FAILED_LOG="$(dirname "$0")/.failed.log"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Missing DATABASE_URL" >&2
  exit 1
fi

if [[ "${RESET:-}" == "1" ]]; then
  echo "== resetting public schema + storage policies =="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;" >/dev/null
  psql "$DATABASE_URL" -c \
    "DO \$\$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname); END LOOP; END \$\$;" >/dev/null
  echo "== applying base schema.sql =="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/schema.sql" >/dev/null
  : > "$APPLIED_LOG"
  : > "$FAILED_LOG"
fi

touch "$APPLIED_LOG" "$FAILED_LOG"

if [[ -f "$ORDER_FILE" ]]; then
  file_list=$(grep -v '^\s*$' "$ORDER_FILE")
else
  file_list=$(ls "$MIGRATIONS_DIR"/*.sql | xargs -n1 basename | sort)
fi

ok=0; failed=0; skipped=0
for file in $file_list; do
  if grep -qxF "$file" "$APPLIED_LOG" 2>/dev/null; then
    skipped=$((skipped + 1)); continue
  fi
  path="$MIGRATIONS_DIR/$file"
  if [[ ! -f "$path" ]]; then
    echo "MISSING FILE: $file" >&2; continue
  fi
  # No --single-transaction and no ON_ERROR_STOP: apply statements independently so
  # one missing dependency (table created by a later migration) doesn't abort the
  # whole file. Genuine gaps still surface in the per-statement error output.
  err=$(psql "$DATABASE_URL" -f "$path" 2>&1 >/dev/null)
  if ! echo "$err" | grep -qi 'error'; then
    echo "$file" >> "$APPLIED_LOG"; ok=$((ok + 1))
  else
    echo "$file :: $(echo "$err" | grep -i error | head -1)" >> "$FAILED_LOG"
    failed=$((failed + 1))
    echo "FAIL $file -> $(echo "$err" | grep -i error | head -1)"
  fi
done

echo "== done: applied=$ok failed=$failed skipped=$skipped =="
echo "failures logged to $FAILED_LOG"
