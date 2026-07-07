# Security Hardening — Full Plan & Changes

This document captures the entire security hardening initiative executed across the Vibey platform on 2026-03-01, covering the plan, every change made, what problems we found, and what remains.

---

## Background

Recurring `TypeError: fetch failed` errors in production (Fly.io) and local dev pointed to fragile network dependencies throughout the stack. Every authenticated API call, mission dispatch, and queue operation depended on live HTTPS calls to Supabase — meaning a single DNS hiccup or network blip would cascade into total failure across auth, DB reads, and mission processing.

---

## The Plan (6 Phases)

### Phase 1 — Auth Path Hardening

**Goal:** Remove the live network call from the authentication hot path.

**Before:** Every request hit Supabase's `auth.getUser()` over HTTPS to validate the JWT. If DNS failed → auth failed → 401 for every request.

**After:** JWT is verified **locally** using cryptographic primitives. No network call needed for HS256 tokens (which all Supabase tokens are).

**Files changed:**

- `packages/api-shared/src/guards/auth.guard.ts` — Rewrote to decode JWT header/payload locally, then:
  - **HS256**: verify signature using `SUPABASE_JWT_SECRET` (symmetric, zero network)
  - **RS256/ES256**: fetch JWKS from Supabase's `.well-known/jwks.json` endpoint (with 5-min cache)
  - Added ES256 support with `dsaEncoding: 'ieee-p1363'`
  - Added strict claim validation (iss, aud, exp, nbf, sub)
  - Added failure taxonomy logging (`jwt_malformed`, `jwt_invalid_alg`, `token_expired`, etc.)
- `packages/api-shared/src/guards/auth.guard.js` / `.d.ts` — Compiled outputs

**Key insight discovered during implementation:** Supabase project tokens use HS256 signing. The JWKS fetch (RS256/ES256 path) is only needed for tokens signed by external identity providers. Since `SUPABASE_JWT_SECRET` was not set in the API `.env`, the guard was falling into the JWKS path unnecessarily, making auth depend on DNS.

**Known gap:** `apps/api/.env` is still missing `SUPABASE_JWT_SECRET`. Adding it would make auth 100% offline for all standard Supabase tokens.

---

### Phase 2 — Supabase Transport Reliability

**Goal:** Make all Supabase HTTP calls resilient to transient network failures.

**Before:** Raw `fetch()` calls — one timeout or DNS blip = immediate crash.

**After:** All Supabase clients use a resilient fetch wrapper with retry + exponential backoff + jitter.

**Files created:**

- `packages/api-shared/src/services/supabase-resilient-fetch.ts` — Shared resilient fetch factory
  - Retries on: 408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524
  - Retries on network errors: ENOTFOUND, ECONNRESET, EAI_AGAIN, ETIMEDOUT, ECONNREFUSED, etc.
  - Configurable: maxRetries, timeoutMs, baseDelayMs, maxDelayMs
  - Logs each retry with label, attempt number, and error code
- `apps/mission-worker/src/lib/services/supabase-resilient-fetch.ts` — Worker-specific copy with adjusted defaults
- `apps/queue-worker/src/lib/services/supabase-resilient-fetch.ts` — Queue-worker-specific copy

**Files changed:**

- `packages/api-shared/src/guards/auth.guard.ts` — Uses resilient fetch for JWKS
- `packages/api-shared/src/services/supabase-client.factory.ts` — Injects resilient fetch into all user-scoped Supabase clients
- `apps/mission-worker/src/lib/services/database.service.ts` — Injects resilient fetch into worker's Supabase client
- `apps/queue-worker/src/lib/services/database.service.ts` — Same for queue worker

---

### Phase 3 — Privilege & RLS Model Tightening

**Goal:** Ensure authorization checks don't fail due to RLS conflicts.

**Before:** `RoleGuard` used the user-scoped Supabase client (from `request.supabase`) to fetch user profiles. This could fail if RLS on `user_profiles` blocked the user-scoped client.

**After:** `RoleGuard` creates its own Supabase client using `SUPABASE_SERVICE_ROLE_KEY` for role lookups. This is a privileged operation (checking roles) that should not be gated by the user's own RLS.

**Files changed:**

- `packages/api-shared/src/guards/role.guard.ts` — Uses dedicated service-role client for role checks

**Documentation created:**

- `.docs/security/privilege-boundaries.md` — Documents which surfaces use service-role and why

---

### Phase 4 — Queue Dispatch Security & Reliability

**Goal:** Replace database polling with event-driven dispatch; add circuit breaker for resilience.

**Before:** Mission worker polled Supabase every 2 seconds to check for new work. This created constant load and was fragile during network issues.

**After:** Event-driven architecture using PostgreSQL `LISTEN/NOTIFY` + transactional outbox pattern.

#### 4a — Transactional Outbox

**Database migration created:**

- `supabase/migrations/` — Created `mission_outbox` table with:
  - `id`, `mission_id`, `user_id`, `event_type`, `dedupe_key` (unique), `payload`
  - `status` (pending → processing → processed / dead_letter)
  - `attempts`, `max_attempts`, `next_attempt_at`, `locked_at`, `error`
  - RLS policies for service-role management + user insert/select own rows
  - Indexes for dispatch scan, mission lookup, and dedupe

**API changes:**

- `apps/api/src/modules/missions/services/missions.service.ts` — Mission create/retry/comment now insert into `mission_outbox` within the same transaction as the mission state change

#### 4b — LISTEN/NOTIFY Dispatch

**Database migration created:**

- `supabase/migrations/20260301091500_mission_outbox_notify_wakeup.sql` — Trigger function `notify_mission_outbox_new()` that sends `pg_notify('mission_outbox_new', NEW.id::text)` on insert or update-to-pending

**Worker changes:**

- `apps/mission-worker/src/modules/missions/services/missions.outbox-dispatcher.service.ts` — Complete rewrite:
  - On startup: opens dedicated PG connection, runs `LISTEN mission_outbox_new`
  - On notification: immediately runs `dispatchDueEvents()`
  - Fallback: reconcile sweep every 60s (catches anything NOTIFY missed)
  - Circuit breaker: after N consecutive failures, pauses dispatch for configurable duration
  - DB transport fallback: if direct PG connection fails, falls back to Supabase REST client
  - Claims rows with `FOR UPDATE SKIP LOCKED` (prevents double-processing)

#### 4c — Scheduler Cutover

- `apps/mission-worker/src/modules/missions/services/missions.scheduler.ts` — Changed from mission-polling to watchdog-only:
  - Detects stalled subtasks/missions (in_progress but no active gateway session)
  - Auto-retries failed missions (with cooldown and max retry cap)
  - Pauses watchdogs if direct DB transport is down

#### 4d — Direct Postgres Connection

- `apps/mission-worker/src/lib/services/database.service.ts` — Added native `pg` Pool:
  - Reads `SUPABASE_DIRECT_DB_URL` from env
  - Strips SSL query params from URL, forces `ssl: { rejectUnauthorized: false }`
  - Validates URL isn't a placeholder before initializing pool
  - Exposes `pgQuery()`, `withPgClient()`, `hasPgPool()`, `getPgPool()`
  - Falls back gracefully if direct connection unavailable

**Configuration:**

- `apps/mission-worker/src/config/configuration.ts` — Added `outboxReconcileMs`, `outboxCircuitBreakerFailures`, `outboxCircuitBreakerMs`

---

### Phase 5 — Infra Guardrails

**Goal:** Pre-deployment health checks to catch connectivity issues before they hit production.

**Files created:**

- `scripts/security/predeploy-health-gate.mjs` — Node.js script that checks:
  - Supabase DNS resolution
  - Auth endpoint reachability
  - Database roundtrip (via PostgREST)
  - Outbox insert/select/cleanup sanity
  - Exits non-zero if any check fails

**Files changed:**

- `package.json` — Added `security:predeploy:check` script
- `docker/DEPLOY.md` — Updated deployment instructions to run health gate before deploy

---

### Phase 6 — Observability, Alerting & SLOs

**Goal:** Document monitoring targets and runbook for incident response.

**Files created:**

- `.docs/runbooks/security-hardening-runbook.md` — Scope, SLO targets, alert thresholds, triage checklist, recovery actions
- `.docs/observability/security-slo-alerts.json` — Structured alert rule definitions for auth failures, transport retries, outbox lag, dead-letters

---

## Issues Found During Implementation

### 1. ES256 JWT Signature Verification

- Supabase tokens arrived with `alg: "HS256"` but the guard initially only supported RS256
- Added HS256 support, then ES256 with the required `dsaEncoding: 'ieee-p1363'` for correct signature format

### 2. Direct Postgres Connection Debugging

- Initial `SUPABASE_DIRECT_DB_URL` had placeholder password → pool failed silently
- Port 5432 (direct) was unreachable from local Mac → switched to port 6543 (session-mode pooler)
- Username format: plain `postgres` works, `postgres.project_ref` does not for direct host
- Working connection string: `postgresql://postgres:<password>@db.<project_ref>.supabase.co:6543/postgres`

### 3. BullMQ Job ID Constraint

- Outbox dispatcher generates job IDs like `outbox:<uuid>:plan` — BullMQ rejects IDs containing `:`
- **Status: unfixed** — subtask dispatch via outbox is currently blocked by this error

### 4. DNS Resolution Intermittency (macOS)

- Observed `ENOTFOUND` for `qfrvykscoymiwwgysvsr.supabase.co` in sustained bursts (minutes at a time)
- Affects all HTTPS paths simultaneously (auth, DB reads, role checks)
- Not a code issue — macOS DNS resolver intermittently fails
- **Mitigation**: HS256 local verification eliminates auth dependency on DNS
- **Remaining exposure**: all Supabase REST API calls (PostgREST reads/writes) still depend on DNS

### 5. Missing `SUPABASE_JWT_SECRET` in API env

- Auth guard falls into JWKS network path instead of local HS256 verification
- **Status: unfixed** — needs to be added to `apps/api/.env`

---

## Files Changed (Complete List)

### Packages

| File                                                           | Change                                     |
| -------------------------------------------------------------- | ------------------------------------------ |
| `packages/api-shared/src/guards/auth.guard.ts`                 | Local JWT verification (HS256/RS256/ES256) |
| `packages/api-shared/src/guards/role.guard.ts`                 | Service-role client for role checks        |
| `packages/api-shared/src/services/supabase-resilient-fetch.ts` | **New** — resilient fetch wrapper          |
| `packages/api-shared/src/services/supabase-client.factory.ts`  | Inject resilient fetch                     |

### Mission Worker

| File                                                                                      | Change                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| `apps/mission-worker/src/lib/services/database.service.ts`                                | Native PG pool + resilient fetch           |
| `apps/mission-worker/src/lib/services/supabase-resilient-fetch.ts`                        | **New** — worker resilient fetch           |
| `apps/mission-worker/src/modules/missions/services/missions.outbox-dispatcher.service.ts` | LISTEN/NOTIFY + circuit breaker + fallback |
| `apps/mission-worker/src/modules/missions/services/missions.scheduler.ts`                 | Watchdog-only (no polling)                 |
| `apps/mission-worker/src/modules/missions/services/missions.service.ts`                   | Outbox event helpers via native SQL        |
| `apps/mission-worker/src/config/configuration.ts`                                         | Outbox config params                       |
| `apps/mission-worker/.env`                                                                | Direct DB URL added                        |

### Queue Worker

| File                                                             | Change                                 |
| ---------------------------------------------------------------- | -------------------------------------- |
| `apps/queue-worker/src/lib/services/database.service.ts`         | Resilient fetch                        |
| `apps/queue-worker/src/lib/services/supabase-resilient-fetch.ts` | **New** — queue-worker resilient fetch |

### API

| File                                                         | Change                      |
| ------------------------------------------------------------ | --------------------------- |
| `apps/api/src/modules/missions/services/missions.service.ts` | Transactional outbox writes |

### Database Migrations

| File                                                                  | Change                       |
| --------------------------------------------------------------------- | ---------------------------- |
| `supabase/migrations/` (mission_outbox)                               | Outbox table + RLS + indexes |
| `supabase/migrations/20260301091500_mission_outbox_notify_wakeup.sql` | NOTIFY trigger               |

### Scripts & Docs

| File                                           | Change                             |
| ---------------------------------------------- | ---------------------------------- |
| `scripts/security/predeploy-health-gate.mjs`   | **New** — pre-deploy health checks |
| `package.json`                                 | Added `security:predeploy:check`   |
| `docker/DEPLOY.md`                             | Updated deploy instructions        |
| `.docs/runbooks/security-hardening-runbook.md` | **New** — runbook                  |
| `.docs/observability/security-slo-alerts.json` | **New** — alert definitions        |
| `.docs/security/privilege-boundaries.md`       | **New** — privilege model docs     |

---

## Open Items

| #   | Issue                                                     | Impact                                                         | Fix                                                                 |
| --- | --------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | `SUPABASE_JWT_SECRET` missing from `apps/api/.env`        | Auth falls back to JWKS network call                           | Add the secret to env                                               |
| 2   | BullMQ rejects job IDs with `:` character                 | Subtask dispatch from outbox fails                             | Sanitize job IDs (replace `:` with `-`)                             |
| 3   | macOS DNS intermittency                                   | All Supabase REST calls fail during DNS outage                 | Flush DNS cache; long-term: direct PG for critical reads            |
| 4   | Outbox rows not consumed when only prod worker is running | Prod worker fetches to `localhost:3003` (user profile routing) | Ensure profile routing matches the environment consuming the outbox |
