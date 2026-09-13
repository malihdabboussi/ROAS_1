# Test Run 02

## Environment

| Item         | Value                                               |
| ------------ | --------------------------------------------------- |
| Date         | Sunday 2026-09-06, ~00:16–00:30 CET (UTC+1)         |
| OS           | macOS 14 (Darwin 23.6.0)                            |
| Node         | 22.23.2 via nvm                                     |
| pnpm         | 9.15.4                                              |
| Commit       | `f4757c2b` on `main`                                |
| Working tree | dirty (pre-existing) + new `project-mapping/` files |

This run did **not** re-execute the full unit suites from test-run-01. It checked whether the previously booted stack was still alive, and filled documentation gaps (README + remaining feature maps).

## Services Running

| Service          | Port  | State    |
| ---------------- | ----- | -------- |
| `apps/web`       | 3000  | **DOWN** |
| `apps/api`       | 3001  | **DOWN** |
| `apps/agent-api` | 3003  | **DOWN** |
| OpenClaw gateway | 18789 | **DOWN** |
| Redis            | 6379  | **DOWN** |

```text
nc -z 127.0.0.1 3000 → refused
nc -z 127.0.0.1 3001 → refused
nc -z 127.0.0.1 3003 → refused
nc -z 127.0.0.1 18789 → refused
nc -z 127.0.0.1 6379 → refused
curl http://localhost:3000/ → connection failed (000)
```

Terminal history from the previous session still shows `pnpm dev:app`, `pnpm dev:agent`, and Nest chat logs, but those processes are no longer listening.

## Commands Used

```bash
pwd
git branch --show-current
git log -1 --oneline
nvm use 22 && node -v
nc -z / curl health probes on 3000, 3001, 3003, 18789, 6379
```

No test runner, no seed, no migration, no deploy script, no `.env` values printed.

## Scenarios Tested

1. Confirm Node 22 is available (yes — 22.23.2).
2. Confirm whether Level-2 stack from test-run-01 is still up (no).
3. Spot-check CRITICAL billing/org guard code (`org-role.guard.ts:63-65`, `billing-agent-brain.controller.ts:72-79`).
4. Confirm `apps/admin` has no `/orgs` route.

## Passed

- Node 22.23.2 resolves via nvm.
- `OrgRoleGuard` pass-through when `!orgId` re-confirmed in source.
- Caller-supplied `body.orgId` on `POST /api/billing/agent-brain/checkout` re-confirmed in source.
- Admin `/orgs` page does not exist (glob).

## Failed

None — no suites re-run.

## Blocked

| Item                                 | Why                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| Re-probe `/api`, `/login`, `/a/test` | servers down                                                                       |
| Authenticated user flows             | no credentials; configured DB may be production                                    |
| Redis / workers                      | Redis not running                                                                  |
| Full stack reboot                    | would start crons against `.env` unless `VERCEL=1`; not required to finish the map |

## Unexpected Behavior

None new. Absence of the previous session's servers is expected after those jobs exited.

## Console Errors

None (no app process).

## Backend Errors

None (API down).

## Database Errors

None (database not contacted).

## Screens / Routes Tested

None this run. See [`test-run-01.md`](./test-run-01.md) for the 2026-09-05 HTTP probes.

## Findings

1. The mapping docs from 2026-09-05 were complete except **`README.md` was missing** (progress file claimed it existed) and only 8 of ~17 major feature maps were written.
2. This run added `README.md`, 9 feature maps, and this journal. No source was modified.
3. Runtime confidence is unchanged: Level 2 was proven yesterday and is down today.

## Questions Raised

No new questions. Existing Tier-1 list in [`../17-open-questions.md`](../17-open-questions.md) still applies, especially “what is Supabase project `sicxiwyukxtqicevlwuc`?”
