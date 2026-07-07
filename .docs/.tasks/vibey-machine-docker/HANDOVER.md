# Vibey Machine — Handover Document

**Date:** 2026-02-15
**Status:** 95% complete — artifact saves failing due to DB schema mismatches

---

## What Was Built (Complete)

1. **Docker image** with OpenClaw + agent-api + Vibey workspace
2. **Deployed to Fly.io** — app `vibey-machines`, region Amsterdam
3. **13 personal machines** created (1 per user, all 12 users + 1 original test)
4. **Artifacts NestJS module** — POST /api/artifacts with 21 actions
5. **Per-user proxy routing** — frontend routes chat to user's Fly.io machine
6. **Onboarding page** — /onboarding with animation + machine provisioning
7. **Middleware** — redirects new users to onboarding
8. **DB migrations** — fly_machine columns + onboarding_animation_seen on profiles
9. **Skills rewritten** — using exec curl to localhost:3003/api/artifacts

## What's Broken Right Now

**The artifacts service has DB schema mismatches.** Two fixes already applied locally (not yet deployed):

### Fix 1: funnel_pages — ALREADY FIXED in local code

- **Error:** `Could not find the 'user_id' column of 'funnel_pages'`
- **Cause:** `addFunnelPage()` in artifacts.service.ts inserts `user_id` but the `funnel_pages` table has no `user_id` column. Pages belong to funnels via `funnel_id`.
- **Fix applied:** Removed `user_id: this.userId` from the funnel_pages insert in `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`

### Fix 2: documents table — ALREADY FIXED in local code

- **Error:** `Could not find the table 'public.documents'`
- **Cause:** Table is named `conversation_documents`, not `documents`
- **Fix applied:** Changed `documents` → `conversation_documents` in both `listDocuments()` and `saveDocument()` methods

### What Needs To Happen

1. **Check ALL table/column names** in artifacts.service.ts against the actual Supabase schema. The Edge Function on the VM (`/root/repos/VibeyV2/supabase/functions/vibey-artifacts/index.ts`) also had some of these wrong — the VM version used service role key which bypasses some checks. Compare every INSERT/SELECT in the service against actual DB schema using `/supa-project`.
2. **Commit the fixes** (already applied locally on develop branch, not committed yet)
3. **Rebuild and deploy** to Fly.io: `flyctl deploy --config docker/fly.toml --dockerfile docker/Dockerfile --remote-only`
4. **Update sefy's machine** to new image: `flyctl machines update d8995eefe4e768 --app vibey-machines --yes`
5. **Test** by chatting with Vibey and asking to create a funnel

## Key Files

| File                                                                       | What                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`       | **THE FILE WITH THE BUGS** — all DB queries live here |
| `apps/agent-api/src/modules/artifacts/controllers/artifacts.controller.ts` | Controller (thin, just routes to service)             |
| `apps/agent-api/src/modules/artifacts/guards/internal-auth.guard.ts`       | Validates x-openclaw-internal header                  |
| `docker/openclaw.json`                                                     | OpenClaw config — exec allowed, write/edit denied     |
| `docker/agents/vibey/skills/vibey-api/SKILL.md`                            | How Vibey calls the backend (exec curl)               |
| `docker/Dockerfile`                                                        | Docker build                                          |
| `docker/supervisord.conf`                                                  | Runs OpenClaw gateway + agent-api                     |
| `apps/web/src/app/api/proxy/[...path]/route.ts`                            | Frontend proxy — routes to user's Fly.io machine      |
| `apps/web/src/app/api/machines/provision/route.ts`                         | Creates Fly.io machine for user                       |
| `apps/web/src/middleware.ts`                                               | Onboarding redirect logic                             |
| `apps/web/src/app/(auth)/onboarding/page.tsx`                              | Onboarding animation page                             |

## Architecture

```
Frontend (Vercel) → Proxy route → resolves user's fly_machine_url from profile
                                → routes to https://vibey-machines.fly.dev
                                → Fly.io routes to user's machine
                                → agent-api receives chat POST
                                → sends to OpenClaw gateway (localhost:18789)
                                → Vibey agent processes, uses exec curl to save
                                → curl hits localhost:3003/api/artifacts
                                → ArtifactsService writes to Supabase
```

## Fly.io Details

| Item           | Value                                                                                 |
| -------------- | ------------------------------------------------------------------------------------- |
| App name       | vibey-machines                                                                        |
| Region         | ams (Amsterdam)                                                                       |
| Sefy's machine | d8995eefe4e768                                                                        |
| Image          | vibey-machines:deployment-01KHGY8TE40JXTHDH3JD5P6EA9                                  |
| Deploy command | `flyctl deploy --config docker/fly.toml --dockerfile docker/Dockerfile --remote-only` |
| Logs           | `flyctl logs --app vibey-machines --no-tail`                                          |

## Env Vars

**Fly.io app secrets** (shared across all machines):

- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- OPENCLAW_GATEWAY_TOKEN, OPENCLAW_GATEWAY_URL, OPENCLAW_AGENT_ID
- OPENROUTER_API_KEY, PORT

**Per-machine env** (set at creation, unique per user):

- USER_ID — the user's UUID

**Vercel env vars needed:**

- FLY_API_TOKEN, FLY_APP_NAME (for machine provisioning)

## Tool Approach

Originally built a custom OpenClaw plugin (`vibey_backend`). **Plugin didn't load** — OpenClaw silently ignored it. Switched to `exec curl localhost:3003` approach which uses OpenClaw's built-in `exec` tool. Works but less clean. The plugin is still in `docker/tools/vibey-backend/` for future investigation.

## Open Items for Next Session

1. **Fix all DB schema mismatches** in artifacts.service.ts (check every table/column)
2. **Deploy the fix** and test end-to-end
3. **Add LangSmith tracing** — user wants to see what Vibey receives in context
4. **Investigate OpenClaw plugin loading** — why vibey_backend plugin didn't load
5. **Onboarding skill** — guided first conversation for new users
6. **SSE enhancement** — richer streaming events

## PRDs Created

- `.docs/.tasks/vibey-machine-docker/prd.json` — main PRD (completed)
- `.docs/.tasks/credential-proxy/prd.json` — deferred to future cycle
- `.docs/.tasks/onboarding-flow/` — not created yet (discussed but not written)
