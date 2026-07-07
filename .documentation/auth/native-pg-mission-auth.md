# Auth + Mission DB Integration Changes (2026-03-01)

## Scope of work completed

This file documents the exact changes implemented in this flow for mission dispatch reliability, direct Postgres integration, and related debugging.

## 1) Native Postgres TCP integration (mission-critical paths)

- Added native Postgres pool support in mission worker:
  - `apps/mission-worker/src/lib/services/database.service.ts`
  - Added pool lifecycle, query helpers, and fail-fast message if direct URL is missing.
- Added direct DB config support:
  - `apps/mission-worker/src/config/configuration.ts`
  - Supports `SUPABASE_DIRECT_DB_URL` (fallbacks: `SUPABASE_DB_URL`, `DATABASE_URL`).
- Added shared direct Postgres provider in API shared package:
  - `packages/api-shared/src/services/postgres-direct.service.ts`
  - Exported via:
    - `packages/api-shared/src/shared.module.ts`
    - `packages/api-shared/src/index.ts`

## 2) Mission worker hot loop migration (supabase-js -> native SQL)

- Outbox dispatcher moved to native SQL:
  - `apps/mission-worker/src/modules/missions/services/missions.outbox-dispatcher.service.ts`
  - Fetch/claim/process/retry now use native queries.
- Locking hardening applied:
  - Claim path upgraded to `FOR UPDATE SKIP LOCKED`.
  - Retry/dead-letter semantics preserved.
- Scheduler watchdog paths moved to native SQL:
  - `apps/mission-worker/src/modules/missions/services/missions.scheduler.ts`
  - Stalled checks, auto-retry, and outbox enqueue path use direct SQL.
- Worker follow-up outbox helpers moved to native SQL:
  - `apps/mission-worker/src/modules/missions/services/missions.service.ts`

## 3) API mission write transactional migration

- Added native transactional path (kept existing Supabase client path as fallback):
  - `apps/api/src/modules/missions/services/missions.service.ts`
- Migrated methods to native transaction when direct DB is enabled:
  - `create`
  - `retry`
  - `addUserComment`
  - `internalCreatePlan`
  - `internalCallback`

## 4) Tests added/updated

- Updated worker dispatcher tests for SQL path + lock assertion:
  - `apps/mission-worker/src/modules/missions/services/__tests__/missions.outbox-dispatcher.service.test.ts`
- Added API native-PG mission transaction tests:
  - `apps/api/src/modules/missions/services/__tests__/missions.native-pg.test.ts`
- Validation run completed:
  - worker/api/api-shared typechecks passed.
  - targeted vitest tests passed.

## 5) Supabase MCP checks executed

- Verified migrations include:
  - `mission_outbox`
  - `mission_outbox_rls_insert_fix`
- Verified `mission_outbox` policies exist:
  - service role manage policy
  - user insert-own policy
  - user select-own policy
- Verified expected outbox indexes:
  - dispatch scan index
  - mission index
  - dedupe unique index
  - primary key index

## 6) Local env updates done

- Added direct DB URL setting in worker env:
  - `apps/mission-worker/.env`
  - `SUPABASE_DIRECT_DB_URL=...`
- Password placeholder replaced with provided password and URL-encoding applied.

## 7) Runtime issues observed after changes

- Worker issue observed:
  - `Native Postgres direct pool not initialized` (before env var was added).
  - Then `password authentication failed` and later `ECONNREFUSED ...:5432` while testing direct endpoint.
- API issue observed (separate from worker direct DB):
  - Repeated `ENOTFOUND` for `qfrvykscoymiwwgysvsr.supabase.co` in auth guard and repository reads.
  - Indicates intermittent DNS/network resolution failure for Supabase HTTPS calls.

## 8) Current status

- Code migration for mission-critical direct DB path is implemented.
- DB migration/policy/index checks for outbox are in place.
- Remaining runtime stability depends on:
  - stable connectivity to Supabase direct DB endpoint for worker (`5432` path),
  - stable DNS/network resolution for Supabase HTTPS endpoints used by auth and non-migrated API reads.
