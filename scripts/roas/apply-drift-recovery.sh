#!/usr/bin/env bash
# Apply ROAS drift-recovery DDL, then re-run migrations that failed only because
# drift tables were missing.
#
# Usage:
#   ./scripts/roas/apply-drift-recovery.sh          # Supabase Management API (default)
#   USE_PSQL=1 ./scripts/roas/apply-drift-recovery.sh  # direct psql + DATABASE_URL
#
# API path uses Supabase CLI login (macOS keychain) — same backend as Supabase MCP.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "${USE_PSQL:-}" != "1" && -x "$SCRIPT_DIR/apply-roas-recovery-via-api.sh" ]]; then
  exec "$SCRIPT_DIR/apply-roas-recovery-via-api.sh"
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
RECOVERY_SQL="$SCRIPT_DIR/roas-drift-recovery.sql"
RETRY_LOG="$SCRIPT_DIR/.drift-retry.log"

if [[ -z "${DATABASE_URL:-}" && -f "$SCRIPT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$SCRIPT_DIR/.env" && set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Missing DATABASE_URL (set env or scripts/roas/.env)" >&2
  exit 1
fi

if [[ ! -f "$RECOVERY_SQL" ]]; then
  echo "Missing $RECOVERY_SQL" >&2
  exit 1
fi

echo "== applying drift recovery DDL =="
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$RECOVERY_SQL"

echo "== verifying drift tables =="
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'skill_library',
    'skill_library_resources',
    'template_skill_assignments',
    'user_notifications',
    'social_posts',
    'social_post_schedules',
    'agent_channels',
    'app_errors',
    'billing_health_log',
    'billing_health_checks'
  )
ORDER BY tablename;
"

# Migrations that failed primarily because drift tables were absent.
RETRY_MIGRATIONS=(
  20260310150000_social_post_schedules.sql
  20260313210000_add_social_post_schedules_to_realtime.sql
  20260326190000_agent_channels_is_public.sql
  20260327100001_add_org_id_to_existing_tables.sql
  20260329020000_add_org_id_to_social_post_schedules.sql
  20260331210000_fix_agent_channels_unique_constraint_org_scope.sql
  20260401300000_org_scope_notifications_awareness.sql
  20260402121000_social_posts_video.sql
  20260420100000_idx_social_posts_campaign_platform.sql
  20260513110000_security_advisors_phase1.sql
  20260513120200_perf_advisors_phase1a_index_hygiene.sql
  20260513120300_perf_advisors_phase1b_rls_initplan.sql
  20260513140000_user_notifications_type_space_tasks.sql
  20260513144500_perf_phase2_optionA_smart_batch.sql
  20260520150500_user_notifications_metadata_and_type_allowlist.sql
  20260520154000_add_space_id_to_campaign_artifacts.sql
  20260604123000_user_notifications_type_human_dm_message.sql
  20260610200000_social_intel_viral_research_rewrite.sql
  20260615125500_seed_seo_research_skill.sql
  20260620121054_presentation_builder_fixed_stage_skill.sql
  20260624125739_trace_triage_observability_correlation.sql
  20260624133616_request_route_source_observability.sql
  20260624160401_observability_noise_actionability_fields.sql
)

: > "$RETRY_LOG"
ok=0
failed=0

echo "== retrying drift-dependent migrations =="
for file in "${RETRY_MIGRATIONS[@]}"; do
  path="$MIGRATIONS_DIR/$file"
  if [[ ! -f "$path" ]]; then
    echo "SKIP missing $file" | tee -a "$RETRY_LOG"
    continue
  fi
  err=$(psql "$DATABASE_URL" -f "$path" 2>&1 >/dev/null)
  if ! echo "$err" | grep -qi 'error'; then
    echo "OK   $file" | tee -a "$RETRY_LOG"
    ok=$((ok + 1))
  else
    first_err=$(echo "$err" | grep -i error | head -1)
    echo "FAIL $file -> $first_err" | tee -a "$RETRY_LOG"
    failed=$((failed + 1))
  fi
done

echo "== drift retry done: ok=$ok failed=$failed (log: $RETRY_LOG) =="

if [[ -x "$SCRIPT_DIR/apply-social-scheduling.sh" ]]; then
  echo ""
  "$SCRIPT_DIR/apply-social-scheduling.sh"
fi
