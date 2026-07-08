#!/usr/bin/env bash
# Apply supabase/migrations/*.sql to ROAS Lovable Cloud Postgres in sorted order.
#
# Usage:
#   DATABASE_URL='postgresql://...' ./scripts/roas/apply-lovable-migrations.sh
#
# Options via env:
#   MIGRATION_FROM=001_add_leads_table.sql   start at file (inclusive)
#   MIGRATION_LIMIT=50                     max files this run
#   MIGRATION_DRY_RUN=1                    list only
#
# Requires: psql
# Log: scripts/roas/.lovable-applied-migrations.log (local, gitignored)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
LOG_FILE="$(dirname "$0")/.lovable-applied-migrations.log"

if [[ "${MIGRATION_DRY_RUN:-}" != "1" && -z "${DATABASE_URL:-}" ]]; then
  echo "Missing DATABASE_URL (Lovable Cloud → Database → connection string)" >&2
  exit 1
fi

touch "$LOG_FILE"

ORDER_FILE="$(dirname "$0")/migration-order.txt"
if [[ -f "$ORDER_FILE" ]]; then
  file_list=$(grep -v '^\s*$' "$ORDER_FILE")
else
  file_list=$(ls "$MIGRATIONS_DIR"/*.sql | xargs -n1 basename | sort)
fi

applied=0
for file in $file_list; do
  if [[ -n "${MIGRATION_FROM:-}" && "$file" < "$MIGRATION_FROM" ]]; then
    continue
  fi
  if grep -qxF "$file" "$LOG_FILE" 2>/dev/null; then
    continue
  fi
  if [[ -n "${MIGRATION_LIMIT:-}" && "$applied" -ge "$MIGRATION_LIMIT" ]]; then
    break
  fi
  # Skip pg_cron only when targeting Lovable Cloud (no pg_cron support there)
  if [[ "${SKIP_PG_CRON:-}" == "1" ]] && grep -qi 'pg_cron' "$MIGRATIONS_DIR/$file"; then
    echo "skip (pg_cron): $file"
    echo "$file" >> "$LOG_FILE"
    continue
  fi

  if [[ "${MIGRATION_DRY_RUN:-}" == "1" ]]; then
    echo "would apply: $file"
    applied=$((applied + 1))
    continue
  fi

  echo -n "applying $file... "
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/$file" >/dev/null; then
    echo "ok"
    echo "$file" >> "$LOG_FILE"
    applied=$((applied + 1))
  else
    echo "FAILED" >&2
    exit 1
  fi
done

echo "Done. Applied $applied migration(s) this run."
