#!/usr/bin/env bash
# Apply ROAS drift recovery + social scheduling via Supabase Management API,
# then retry dependent migrations through the same API.
#
# Usage:
#   ./scripts/roas/apply-roas-recovery-via-api.sh

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
API="$SCRIPT_DIR/apply-via-supabase-api.sh"
RETRY_LOG="$SCRIPT_DIR/.drift-retry-api.log"

if [[ ! -x "$API" ]]; then
  echo "Missing $API" >&2
  exit 1
fi

echo "== ROAS recovery via Supabase Management API =="
"$API" \
  "$SCRIPT_DIR/roas-drift-recovery.sql" \
  "$SCRIPT_DIR/roas-social-scheduling-complete.sql"

echo "== verify via API =="
VERIFY_SQL="$SCRIPT_DIR/.verify-recovery-api.sql"
cat > "$VERIFY_SQL" <<'SQL'
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'skill_library',
    'social_posts',
    'social_post_schedules',
    'user_notifications',
    'agent_channels',
    'app_errors'
  )
ORDER BY tablename;
SQL
"$API" "$VERIFY_SQL"
rm -f "$VERIFY_SQL"

RETRY_MIGRATIONS=(
  20260310150000_social_post_schedules.sql
  20260313210000_add_social_post_schedules_to_realtime.sql
  20260329020000_add_org_id_to_social_post_schedules.sql
  20260402121000_social_posts_video.sql
  20260420100000_idx_social_posts_campaign_platform.sql
  20260513140000_user_notifications_type_space_tasks.sql
  20260520150500_user_notifications_metadata_and_type_allowlist.sql
  20260604123000_user_notifications_type_human_dm_message.sql
  20260615125500_seed_seo_research_skill.sql
  20260620121054_presentation_builder_fixed_stage_skill.sql
)

: > "$RETRY_LOG"
ok=0
failed=0

echo "== retry dependent migrations via API =="
for file in "${RETRY_MIGRATIONS[@]}"; do
  path="$MIGRATIONS_DIR/$file"
  if [[ ! -f "$path" ]]; then
    echo "SKIP missing $file" | tee -a "$RETRY_LOG"
    continue
  fi
  if "$API" "$path" >> "$RETRY_LOG" 2>&1; then
    echo "OK   $file" | tee -a "$RETRY_LOG"
    ok=$((ok + 1))
  else
    echo "FAIL $file (see $RETRY_LOG)" | tee -a "$RETRY_LOG"
    failed=$((failed + 1))
  fi
done

echo "== API retry done: ok=$ok failed=$failed (log: $RETRY_LOG) =="
