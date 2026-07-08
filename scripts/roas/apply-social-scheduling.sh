#!/usr/bin/env bash
# Finish ROAS social scheduling DB setup (realtime + org/campaign RLS).
#
# Usage:
#   ./scripts/roas/apply-social-scheduling.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL="$SCRIPT_DIR/roas-social-scheduling-complete.sql"

if [[ -z "${DATABASE_URL:-}" && -f "$SCRIPT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$SCRIPT_DIR/.env" && set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Missing DATABASE_URL" >&2
  exit 1
fi

echo "== applying social scheduling completion =="
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL"

echo "== verify =="
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('social_posts', 'social_post_schedules')
ORDER BY tablename;
"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
SELECT policyname
FROM pg_policies
WHERE tablename = 'social_posts'
ORDER BY policyname;
"

echo "== done =="
