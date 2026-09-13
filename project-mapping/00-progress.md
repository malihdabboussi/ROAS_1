# Mapping Progress

> Investigation log for the `project-mapping/` reverse-engineering effort.
> Update this file at the start and end of every session so work can resume across Cursor sessions.

**Last updated:** 2026-09-06
**Repo commit at time of mapping:** `f4757c2b` (`feat(web): flatten sidebar navigation (#2)`) on branch `main`
**Working tree:** dirty — pre-existing local edits plus this documentation folder. No application source was modified by the mapping work.

---

## Status by area

| Area                 | Status                                         | Notes                                                                                               |
| -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Repository structure | **COMPLETE**                                   | 21 workspaces classified. See `01-repository-overview.md`                                           |
| Application startup  | **COMPLETE (documented, partially verified)**  | Level 2 booted 2026-09-05; **down** on 2026-09-06. See `02-how-to-run.md`, `testing/test-run-02.md` |
| Frontend             | **COMPLETE**                                   | 57 routes, 35 feature domains, proxy chain traced                                                   |
| Backend              | **COMPLETE**                                   | 57 modules, 336 controllers, 1,632 routes                                                           |
| Database             | **COMPLETE (static)**                          | 937 migrations analysed. **Live schema never queried**                                              |
| APIs                 | **COMPLETE**                                   | `05-api-map.md`                                                                                     |
| Features             | **COMPLETE**                                   | `04-feature-inventory.md` + 17 files under `features/`                                              |
| Authentication       | **COMPLETE**                                   | `08-auth-security.md` — CRITICAL findings re-confirmed in source 2026-09-06                         |
| Permissions          | **COMPLETE**                                   | Platform roles, org roles, agent-policy                                                             |
| Integrations         | **COMPLETE**                                   | ~45 integrations — `09-integrations.md`                                                             |
| Background jobs      | **COMPLETE**                                   | `10-background-processes.md`                                                                        |
| Configuration        | **COMPLETE**                                   | `11-configuration.md`                                                                               |
| Testing              | **COMPLETE (inventory) / PARTIAL (execution)** | `12-existing-tests.md`, `testing/test-run-01.md`, `testing/test-run-02.md`                          |
| User flows           | **COMPLETE**                                   | `14-user-flows.md`                                                                                  |
| Code health          | **COMPLETE**                                   | `07-dependency-map.md`, `16-code-health-findings.md`                                                |
| Final documentation  | **COMPLETE**                                   | `README.md` written 2026-09-06 (was missing despite earlier progress note)                          |

---

## Current investigation

None active. Stop conditions from the original brief are met.

2026-09-06 session work:

- Confirmed `README.md` was **absent** (progress had marked it complete). Wrote it.
- Added nine feature maps: billing, orgs/teams, funnels/domains, email, admin, home/inbox/channels, flows/meetings, projects, public-agent.
- Re-read `OrgRoleGuard` and `BillingAgentBrainController` — CRITICAL findings still accurate.
- Port probe: 3000/3001/3003/18789/6379 all down.
- Confirmed `apps/admin` has no `/orgs` page.
- Folded late specialist-map findings into `README.md` Known Risks (unreproducible DB, plaintext tokens, unmirrored crons, `web/.env` secret copy, `*.base.ts` gate hole, Sentry never initialized).
- Two feature-deep-dive agents failed on usage limits; those maps were already written here (`features/*.md`, 17 files).
- Late-arriving specialist maps (`08`–`12`, `07`, `16`, `04`) were already on disk; executive `README.md` Known Risks updated to include their sharper findings (DB unreproducible, plaintext tokens, unmirrored crons, `web/.env` secret copy, `

## Last confirmed finding

`OrgRoleGuard` still returns `true` when `request.orgId` is falsy (`packages/api-shared/src/guards/org-role.guard.ts:63-65`). `POST /api/billing/agent-brain/checkout` still forwards caller `body.orgId` into `stripeService.addOrgAgentBrainAddon` with only `AuthGuard` (`billing-agent-brain.controller.ts:72-79`).

## Next area to inspect (for a future session)

Ordered by value. **Do not start a refactor until the owner asks.**

1. **Identify Supabase project `sicxiwyukxtqicevlwuc`.** Until then, treat every local write as production.
2. **Re-run `13-testing-scenarios.md` against a live Level-2 stack** (`VERCEL=1`) and fill Actual Result columns. Do not boot API without `VERCEL=1`.
3. **Query live schema** (read-only) on the confirmed production project `lhfgtsjetcardinpgouq` and reconcile `06-database-map.md`.
4. **Verify Fly reachability** of `roas-runtimes.fly.dev` for the `InternalAuthGuard` finding.
5. **Diff `apps/openclaw` against upstream** `openclaw/openclaw@2026.2.16`.

## Current blockers

| Blocker                                           | Impact                          | Detail                                                           |
| ------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| **Undocumented third Supabase project in `.env`** | Cannot safely write             | `sicxiwyukxtqicevlwuc` vs documented prod `lhfgtsjetcardinpgouq` |
| **No local Redis**                                | Workers cannot be exercised     | 6379 refused on 2026-09-06                                       |
| **No local Supabase**                             | Cannot `supabase start`         | No `config.toml`                                                 |
| **`pnpm dev` port collision**                     | Cannot start everything at once | admin + funnels both 3002                                        |
| **Stack not running this session**                | No new HTTP probes              | Down after previous session exited                               |
| **Repo is dirty**                                 | Findings may drift              | Pre-existing uncommitted app/package changes                     |

## Verification ledger

### 2026-09-05 (test-run-01)

| Command                                   | Result                                      |
| ----------------------------------------- | ------------------------------------------- |
| `pnpm architecture:check`                 | **FAILED** — 25 violations                  |
| `pnpm security:openclaw-workspaces:check` | **PASSED**                                  |
| `pnpm --filter @vibey/agent-policy test`  | **PASSED** — 53/53                          |
| `pnpm --filter @vibey/api-shared test`    | **FAILED** — 117 passed, 2 failed           |
| `pnpm --filter @vibey/api test`           | **FAILED** — ~2191 passed, 23 failed, flaky |
| `pnpm --filter @vibey/web test`           | **FAILED** — 981 files die in setup         |
| `VERCEL=1` API boot + GET `/api`          | **PASSED** — 200, 1,632 routes              |
| Web `/login`, `/forgot-password`          | **PASSED** — 200                            |
| Web `/`                                   | **PASSED** — 307 → `/login`                 |
| Web `/register`                           | **PASSED** — 307 → `/login` (waitlist)      |
| `GET /api/users/me` no auth               | **PASSED** — 401                            |
| `GET /api/health`                         | **FAILED** — 404 (no health route)          |

### 2026-09-06 (test-run-02)

| Command                                     | Result                      |
| ------------------------------------------- | --------------------------- |
| `nvm use 22 && node -v`                     | **PASSED** — v22.23.2       |
| Port probes 3000/3001/3003/18789/6379       | **DOWN**                    |
| Re-read OrgRoleGuard + agent-brain checkout | **CONFIRMED** still present |

Nothing was written to any database. No deploy script was run. No secret values were printed.
