# Platform Familiarization Test Scenarios

> Purpose: a new developer works through these in order and comes out understanding the product.
> These are **manual exploration scenarios**, not automated tests. For the automated suite see [`12-existing-tests.md`](./12-existing-tests.md); for what actually happened when they were attempted see [`testing/test-run-01.md`](./testing/test-run-01.md).

---

## Before You Start — Safety Rules

Three of these matter more than anything else in this folder.

1. **`apps/api` started locally runs in-process cron jobs against whatever database your `.env` points at**, the most frequent every 30 seconds. Always boot with `VERCEL=1` to suppress them:
   ```bash
   VERCEL=1 PORT=3001 pnpm --filter @vibey/api run dev
   ```
2. **The local `.env` points at Supabase project `sicxiwyukxtqicevlwuc`**, which is documented nowhere. Until someone confirms it is a staging project, treat every write as a production write. Do not run `pnpm seed:*`.
3. **Do not run E2E tests** (`pnpm test:e2e`, `pnpm test:e2e:task-sync`). They may hit live third-party systems.

Scenarios below are tagged **SAFE** (read-only), **WRITE** (mutates data — needs a confirmed non-production database), or **BLOCKED** (cannot be run in the current environment).

Status legend: ✅ VERIFIED THIS SESSION · ⬜ NOT RUN · 🚫 BLOCKED

---

## Group 1 — Startup & Health

### Scenario 1.1 — Backend boots and serves — SAFE ✅

|                   |                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**     | Confirm `apps/api` compiles and serves HTTP                                                                                               |
| **Preconditions** | Node 22, `pnpm install` done, `apps/api/.env` present                                                                                     |
| **User role**     | none                                                                                                                                      |
| **Steps**         | 1. `nvm use 22`<br>2. `VERCEL=1 PORT=3001 pnpm --filter @vibey/api run dev`<br>3. Wait for `[vibey-api] Running on http://localhost:3001` |
| **Expected**      | Boots; TypeScript reports 0 errors                                                                                                        |
| **Actual**        | ✅ Booted. `Found 0 errors`. **1,632 routes mapped.** Cold boot ~3.5 min.                                                                 |
| **APIs**          | —                                                                                                                                         |
| **Tables**        | —                                                                                                                                         |
| **Issues found**  | Cold boot time is very long; noisy pnpm warnings about ignored `pnpm` fields                                                              |

### Scenario 1.2 — Health endpoint — SAFE ✅

|              |                                                                                                                                                                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**    | `curl http://localhost:3001/api`                                                                                                                                                                                                                                      |
| **Expected** | 200 with a status payload                                                                                                                                                                                                                                             |
| **Actual**   | ✅ `{"status":"ok","service":"vibey-api","version":"0.1.0","timestamp":"..."}`                                                                                                                                                                                        |
| **Note**     | The handler is `apps/api/src/health.controller.ts` and is a **shallow** check — it does not verify Supabase or Redis. A green health check does **not** mean the system is functional. `apps/agent-api` has a deeper `/api/health/deep` used by the Fly health check. |

### Scenario 1.3 — Frontend boots and renders — SAFE ✅

|              |                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Steps**    | `pnpm --filter @vibey/web run dev`, then `curl http://localhost:3000/login`                                                |
| **Expected** | 200, login page HTML                                                                                                       |
| **Actual**   | ✅ 200, 59,669 bytes, `<title>Account \| ROAS</title>`. `Ready in` ~40 s; first request to each route compiles for 6–45 s. |

### Scenario 1.4 — Non-API paths are rejected at the edge — SAFE ⬜

|                    |                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**      | Verify `enforceApiSurface` runs before NestJS                                                                                    |
| **Steps**          | `curl -i http://localhost:3001/anything-else`                                                                                    |
| **Expected**       | 404 with an empty body, produced by `apps/api/src/middleware/external-surface.middleware.ts` — **not** a NestJS 404 JSON payload |
| **Why it matters** | Confirms the Express middleware layer sits in front of Nest, which is easy to miss when reading `main.ts`                        |

### Scenario 1.5 — Worker startup without Redis — SAFE ⬜

|                    |                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**      | Learn the failure mode when Redis is absent                                                                                              |
| **Steps**          | With no Redis running, `pnpm --filter @vibey/queue-worker run dev`                                                                       |
| **Expected**       | Connection errors, retry loop                                                                                                            |
| **Why it matters** | Establishes that queue work fails **silently from the user's perspective** — emails sit at `status='scheduled'` forever with no UI error |

---

## Group 2 — Authentication

### Scenario 2.1 — Unauthenticated dashboard access redirects — SAFE ✅

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Steps**    | `curl -i http://localhost:3000/`                        |
| **Expected** | 307 to login, preserving intended destination           |
| **Actual**   | ✅ `307 → /login?redirect=%2F`                          |
| **APIs**     | none — handled entirely in `apps/web/src/middleware.ts` |
| **Tables**   | none for the anonymous path                             |

### Scenario 2.2 — Registration is closed — SAFE ✅

|                  |                                                                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**        | `curl -i http://localhost:3000/register`                                                                                                                                               |
| **Expected**     | Renders a signup form                                                                                                                                                                  |
| **Actual**       | ✅ **307 → `/login`.** Public signups are disabled by `NEXT_PUBLIC_WAITLIST_MODE !== 'false'` (`middleware.ts:95`)                                                                     |
| **Issues found** | The register page component still exists and is fully built, but is unreachable in the default configuration. A newcomer will waste time on it. This is a **product** fact, not a bug. |

### Scenario 2.3 — API rejects missing credentials — SAFE ✅

|              |                                                                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**    | `curl http://localhost:3001/api/users/me`                                                                                                                                    |
| **Expected** | 401                                                                                                                                                                          |
| **Actual**   | ✅ `401 {"message":"Missing or invalid Authorization header","error":"Unauthorized","statusCode":401}`; server logged `WARN [AuthGuard] [AUTH] missing_authorization_header` |

### Scenario 2.4 — API rejects a forged token — SAFE ⬜

|                    |                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**          | `curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.x" http://localhost:3001/api/users/me`                                                                                |
| **Expected**       | 401. JWTs are verified asymmetrically against the Supabase JWKS endpoint (`packages/api-shared/src/services/supabase-jwt-verifier.service.ts`), so an unsigned or HS256-signed token must fail |
| **Why it matters** | This is the strongest part of the auth stack — worth confirming firsthand                                                                                                                      |

### Scenario 2.5 — Successful login — WRITE 🚫

|                        |                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Blocked because**    | No test credentials, and the configured Supabase project may hold real user data. Creating a user would write to it.                                                  |
| **What to do instead** | Get a throwaway account on a confirmed staging project, then walk `/login` → `/home` with DevTools Network open and watch the middleware's four Supabase queries fire |

### Scenario 2.6 — The onboarding state machine — WRITE ⬜

|                      |                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**        | Understand why a logged-in user lands where they land                                                                                                                                                                                                                                                                                                                                                                               |
| **Preconditions**    | Test account on a safe project                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Steps**            | Log in with accounts in each state and record the destination:<br>a. `onboarding_completed = false` → expect `/onboarding`<br>b. onboarding done, no machine/runtime → expect `/setting-up`<br>c. no active subscription and no active org membership → expect `/no-org-access`<br>d. `account_mode = 'org_only'` → expect the dashboard regardless of runtime<br>e. `role = 'user'` visiting `/admin` → expect redirect to `/home` |
| **Logic under test** | `apps/web/src/lib/auth/access-routing.ts` → `resolveAccessStatus()` and `resolveAuthenticatedRedirect()`                                                                                                                                                                                                                                                                                                                            |
| **Tables**           | `user_profiles`, `profiles`, `user_subscriptions`, `org_members`                                                                                                                                                                                                                                                                                                                                                                    |
| **Why it matters**   | This single function determines the entire first-run experience, and it reads from **two different profile tables**                                                                                                                                                                                                                                                                                                                 |

### Scenario 2.7 — Session expiry — WRITE ⬜

|              |                                                                |
| ------------ | -------------------------------------------------------------- |
| **Steps**    | Log in, delete the Supabase auth cookies in DevTools, navigate |
| **Expected** | Redirect to `/login?redirect=<path>`                           |

### Scenario 2.8 — Supabase unreachable during auth — SAFE ⬜

|                    |                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Objective**      | Exercise the middleware's 4-second timeout guard                                                                  |
| **Steps**          | Point `NEXT_PUBLIC_SUPABASE_URL` at an unroutable host (e.g. `https://10.255.255.1`), restart web, load `/login`  |
| **Expected**       | Page still renders after ~4 s — `withTimeout(..., SUPABASE_TIMEOUT_MS)` resolves null rather than throwing        |
| **Why it matters** | Confirms graceful degradation, and shows you the 4 s latency floor that this design imposes when Supabase is slow |

---

## Group 3 — Authorization & Tenant Isolation

> These probe **confirmed** findings from [`08-auth-security.md`](./08-auth-security.md). Run them only against a database you are certain is not production.

### Scenario 3.1 — Cross-org billing portal access — WRITE 🚫 **CRITICAL**

|                                      |                                                                                                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**                        | Reproduce the confirmed org-billing takeover                                                                                                                                            |
| **Finding under test**               | `OrgRoleGuard` passes through when the `x-org-id` header is **absent**, while `OrgBillingCheckoutController` acts on the `:orgId` **path parameter** using a service-role Stripe client |
| **Steps**                            | As user A (member of org 1 only), call the org billing portal endpoint for org 2's id, **omitting** the `x-org-id` header                                                               |
| **Expected (correct behaviour)**     | 403                                                                                                                                                                                     |
| **Expected (actual, per code read)** | A Stripe customer-portal session for an org the caller does not belong to                                                                                                               |
| **Blocked because**                  | Requires two real orgs and live Stripe credentials. **Do not run against production.**                                                                                                  |
| **Priority**                         | This should be the first thing fixed after this mapping exercise                                                                                                                        |

### Scenario 3.2 — agent-api internal surface — SAFE ⬜ **CRITICAL**

|                        |                                                                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**          | Test whether `InternalAuthGuard` really accepts a non-secret header                                                                                                                                                                                         |
| **Finding under test** | `InternalAuthGuard` accepts any request carrying `x-openclaw-internal: true`, and identity comes from an unsigned `x-session-key`                                                                                                                           |
| **Steps**              | Against a **local** agent-api only: `curl -H 'x-openclaw-internal: true' -H 'x-session-key: <crafted>' http://localhost:3003/api/internal/...`                                                                                                              |
| **Expected**           | Should require a shared secret                                                                                                                                                                                                                              |
| **Note**               | `apps/agent-api` is published on the public internet by Fly. Whether the internal routes are reachable from outside is marked NEEDS VERIFICATION in the security doc — **verify by testing the Fly hostname's routing config, not by attacking production** |

### Scenario 3.3 — Platform admin gate — WRITE ⬜

|               |                                                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**     | As a `role = 'user'` account, request `/admin`                                                                                                                                                                                  |
| **Expected**  | 307 → `/home` (`middleware.ts:141`)                                                                                                                                                                                             |
| **Follow-up** | Then call an admin **API** route directly with that user's token. The middleware only guards the _page_; verify the backend controller has its own guard. There is no global `APP_GUARD`, so this must be checked per endpoint. |

### Scenario 3.4 — Unguarded controllers — SAFE ⬜

|                    |                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**      | Confirm the 20-of-336 unguarded controllers are all intentionally public                                                                                                                     |
| **Steps**          | `rg -L "@UseGuards" apps/api/src --glob '*.controller.ts'`, then for each hit confirm it is a webhook with signature verification, a cron with `CRON_SECRET`, or a genuinely public endpoint |
| **Why it matters** | This is the repo's main structural security risk: security is opt-in per controller                                                                                                          |

---

## Group 4 — Core CRUD

> Pick **Contacts** as the reference entity — it is a conventional CRUD domain, unlike Spaces.

### Scenario 4.1 — Contact create / read / update / delete — WRITE ⬜

|                   |                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **Frontend**      | `/contacts` → `apps/web/src/features/contacts`                                                            |
| **Steps**         | Create a contact; open the info panel (`ContactInfoPanel.tsx`); edit a field; add a custom field; delete  |
| **Watch**         | DevTools Network — every call should go to `/api/proxy/...` and be rewritten to `{BACKEND_URL}/api/...`   |
| **Tables**        | contacts/leads tables plus `custom_fields` — see [`features/contacts-crm.md`](./features/contacts-crm.md) |
| **Learning goal** | Watch the proxy hop once and the whole request lifecycle clicks                                           |

### Scenario 4.2 — Search, filter, pagination — WRITE ⬜

|             |                                                                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**   | Search contacts; apply a filter; page through results                                                                                                                                               |
| **Watch**   | Whether filtering happens server-side or client-side. Given there is no react-query and all server state is hand-rolled, check for over-fetching (does it pull all rows and filter in the browser?) |
| **Backend** | `apps/api/src/modules/entity-search`, `segments`                                                                                                                                                    |

### Scenario 4.3 — Validation errors — WRITE ⬜

|              |                                                                                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**    | Submit a contact with an invalid email and with required fields empty                                                                                                                                                  |
| **Expected** | A clear message                                                                                                                                                                                                        |
| **Watch**    | `apps/api` has **no global `ValidationPipe`** (unlike `apps/agent-api`, which sets `whitelist`, `transform`, `forbidNonWhitelisted`). Validation in `apps/api` is per-controller — check whether this endpoint has any |

### Scenario 4.4 — Duplicate data — WRITE ⬜

|              |                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **Steps**    | Create the same contact email twice                                                              |
| **Expected** | Either a friendly dedupe message or a constraint error                                           |
| **Watch**    | If it 500s, that indicates a missing unique constraint surfaced raw — a `Data Integrity` finding |

---

## Group 5 — The Core Product Loop

This is the sequence that defines the product. Work through it once end to end.

### Scenario 5.1 — Open a Space and orient — WRITE ⬜

|           |                                                                                                                                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps** | `/spaces` → open a space → cycle through the List, Kanban, Docs, and Calendar views                                                                                                                                                          |
| **Note**  | `spaces` is the largest feature in the codebase (151 API routes). Also open `/projects` and `/campaigns` and form your own view on whether they are three names for one concept — see [`04-feature-inventory.md`](./04-feature-inventory.md) |

### Scenario 5.2 — Agent chat round trip — WRITE 🚫

|                       |                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**         | The single most important flow in the product                                                                                                               |
| **Preconditions**     | Full agent stack: `apps/api` + `apps/agent-api` + OpenClaw gateway + an `OPENROUTER_API_KEY`                                                                |
| **Steps**             | Open a space chat panel; send a message; watch it stream                                                                                                    |
| **Watch in DevTools** | The request is `POST /api/proxy/chat`, held open, `Content-Type: text/event-stream`. You should see `: heartbeat` comment frames every 25 s on a slow turn. |
| **Then**              | Send a second message while the first is still generating → expect `409 "A generation is already in progress"` (single-flight lock)                         |
| **Then**              | Hit stop → `POST /api/chat/stop` aborts via `StreamRegistryService`                                                                                         |
| **Blocked because**   | Not attempted this session — requires the full stack and LLM spend                                                                                          |
| **Reference**         | The hop-by-hop trace is in [`10-background-processes.md`](./10-background-processes.md) § Agent Run Lifecycle                                               |

### Scenario 5.3 — Chat with Redis down — WRITE ⬜

|                      |                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Objective**        | Verify the documented degradation                                                                                                                                        |
| **Steps**            | Stop Redis, send a chat message                                                                                                                                          |
| **Expected**         | **Chat still works.** The lock acquisition is `.catch(() => true)`, so a Redis failure is treated as lock-acquired and the service falls back to the in-process registry |
| **Secondary effect** | Two browser tabs may now be able to generate concurrently on the same conversation — worth confirming                                                                    |

### Scenario 5.4 — Artifact generation and preview — WRITE ⬜

|               |                                                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**     | Ask an agent to produce a document or funnel; watch the artifact appear; open the preview; edit it                                                                                      |
| **Watch**     | Artifacts arrive through **two** channels — SSE events during the run, and Supabase Realtime on the persisted row (~43 realtime hooks exist). Observe which one actually updates the UI |
| **Reference** | [`features/content-artifacts-studio.md`](./features/content-artifacts-studio.md)                                                                                                        |

### Scenario 5.5 — Stall watchdog — WRITE ⬜

|               |                                                                           |
| ------------- | ------------------------------------------------------------------------- |
| **Objective** | Observe the gateway stream timeouts                                       |
| **Steps**     | Trigger a long agent turn and watch the agent-api logs                    |
| **Expected**  | Warning at 20 s of silence, abort at 120 s, abort-if-still-empty at 300 s |

---

## Group 6 — Background Processing

### Scenario 6.1 — Mission lifecycle — WRITE 🚫

|                     |                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Preconditions**   | Redis + `mission-worker` running                                                                                                         |
| **Steps**           | Create a mission; watch it move through `plan → execute → review`; observe an `awaiting_human` / `pending_approval` pause and approve it |
| **Path under test** | `mission_outbox` row → `pg_notify` → BullMQ → `mission-worker` → callback to `${BACKEND_URL}/api/internal/missions/callback`             |
| **Blocked because** | No local Redis this session                                                                                                              |

### Scenario 6.2 — Worker-down failure mode — WRITE ⬜

|                    |                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Objective**      | Prove the silent-failure claim                                                                                    |
| **Steps**          | With Redis up but `mission-worker` **stopped**, create a mission. Then query `mission_outbox` for `pending` rows. |
| **Expected**       | The row sits at `pending` indefinitely, the Kanban card never moves, and **the UI shows no error**                |
| **Why it matters** | This is the most important operational lesson in the system: queue failures are invisible to users                |

### Scenario 6.3 — Orphaned queues — SAFE ⬜

|               |                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective** | Confirm the dead-queue findings statically                                                                                                                                            |
| **Steps**     | Grep for producers and consumers of `agent-runtime-queue-automation`, `agent-runtime-queue-artifact`, `agent-runtime-queue-subagent`                                                  |
| **Expected**  | `automation` — producer and only consumer both live inside `apps/api` and are gated on `VERCEL !== '1'`, so on Vercel neither runs. `artifact` and `subagent` — declared, never used. |

### Scenario 6.4 — Local cron hazard — SAFE ⬜ **do this one as a read**

|               |                                                                                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective** | Understand the CRITICAL local-dev hazard without triggering it                                                                                                                                                                                     |
| **Steps**     | Read `apps/api/src/cron-runtime-policy.ts` and `apps/api/src/cron.service.ts`. Count the jobs and their schedules. Then start the API **without** `VERCEL=1` **only** against a database you own, and watch the logs for the 30-second job firing. |
| **Expected**  | 10 registered jobs; visible activity within 30 s                                                                                                                                                                                                   |

---

## Group 7 — Integrations

### Scenario 7.1 — Graceful degradation on missing keys — SAFE ✅

|             |                                                                                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**   | Boot `apps/api` without optional integration keys and read the startup log                                                                                                                                                                                                |
| **Actual**  | ✅ Warnings, not crashes: `DEEPGRAM_API_KEY not configured`, `FIRECRAWL_API_KEY not configured — website branding extraction disabled`, `SENDGRID_API_KEY not configured`, `STRIPE_SECRET_KEY not configured -- billing Stripe disabled`, `OrgStripeService ... disabled` |
| **Finding** | This is genuinely well done and worth preserving                                                                                                                                                                                                                          |

### Scenario 7.2 — OAuth connect flow — WRITE ⬜

|               |                                                                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**     | Settings → Integrations → connect a provider → complete OAuth → confirm connected state                                                                                                                              |
| **Watch**     | Where the credential lands. **This differs per provider**: some go into the encrypted `vault_secrets` table, but Stripe (customer OAuth), Meta, and Calendly store `user_integrations.access_token` **in plaintext** |
| **Reference** | [`features/integrations-oauth.md`](./features/integrations-oauth.md), [`09-integrations.md`](./09-integrations.md)                                                                                                   |

### Scenario 7.3 — Vault key mismatch — WRITE ⬜

|               |                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective** | Reproduce a known operational failure                                                                                                         |
| **Steps**     | Set a **different** `VAULT_ENCRYPTION_KEY` in `apps/agent-api/.env` than in `apps/api/.env`, then have an agent use a vault-stored credential |
| **Expected**  | Decryption failure                                                                                                                            |
| **Watch**     | Whether the error is intelligible or a raw crypto exception leaking to the user                                                               |

### Scenario 7.4 — Webhook signature verification — SAFE ⬜

|              |                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Steps**    | POST an unsigned body to a webhook endpoint, e.g. `/api/billing/webhook`                                                                   |
| **Expected** | Rejected. Stripe, Meta, Slack, SendGrid, Composio, WordPress, and Cursor all verify with `timingSafeEqual`                                 |
| **Contrast** | Try the same against the **Calendly** webhook, which has **no** verification, and the **Fathom** webhook, whose verification is rated weak |

---

## Group 8 — Public Surfaces

### Scenario 8.1 — Shared space link — SAFE ✅ (partial)

|                  |                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Steps**        | `curl -i http://localhost:3000/shared/space/test`                                                                              |
| **Actual**       | ✅ 200 (6.6 s first compile) — renders even for a nonexistent id                                                               |
| **Follow-up** ⬜ | Create a real share, open the link **logged out**, and verify only the shared subset is visible. Then try mutating through it. |
| **Tables**       | `space_shares`                                                                                                                 |

### Scenario 8.2 — Public agent page — SAFE ✅ (partial)

|                  |                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Steps**        | `curl -i http://localhost:3000/a/test`                                                                                                                                         |
| **Actual**       | ✅ 404 for an unknown agent key (43.6 s first compile) — correct behaviour                                                                                                     |
| **Follow-up** ⬜ | With a real published agent, chat with it anonymously. Confirm rate limiting exists and that the `x-public-agent-token` minted by `workers/apps-proxy` scopes access correctly |

### Scenario 8.3 — Token-gated review pages — SAFE ⬜

|              |                                                                   |
| ------------ | ----------------------------------------------------------------- |
| **Steps**    | Request `/meeting-review/<random>` and `/request-review/<random>` |
| **Expected** | Rejection, not a rendered page with data                          |
| **Watch**    | Whether tokens are unguessable and whether they expire            |

### Scenario 8.4 — Unsubscribe — SAFE ⬜

|           |                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps** | Open `/unsubscribe` with a crafted parameter                                                                                                    |
| **Watch** | Whether unsubscribing requires a signed token or just an email address. An unauthenticated endpoint that accepts a raw email is an abuse vector |

---

## Group 9 — Error & Failure Conditions

### Scenario 9.1 — Backend down, frontend up — SAFE ⬜

|              |                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------- |
| **Steps**    | Stop `apps/api`, keep web running, navigate the dashboard                                       |
| **Expected** | Clear error states                                                                              |
| **Watch**    | Given hand-rolled fetching with no react-query, look for infinite spinners rather than error UI |

### Scenario 9.2 — Slow backend — SAFE ⬜

|           |                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Steps** | Throttle to "Slow 3G" in DevTools and navigate between dashboard sections                                                       |
| **Watch** | The middleware makes up to 4 sequential Supabase calls per navigation with 4 s timeouts each — measure the real navigation cost |

### Scenario 9.3 — Structured tool errors — WRITE ⬜

|               |                                                                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective** | Verify the tool error contract the repo mandates                                                                                                                                                                                                  |
| **Steps**     | Make an agent call a tool that fails (e.g. an integration with revoked credentials)                                                                                                                                                               |
| **Expected**  | The agent receives a structured error with `error_code`, `error_class`, `effect_state`, `retry_policy`, `correction`, `agent_instruction`, `user_explanation`, `forbidden_user_framing`, `observability.fingerprint` — never a raw platform error |
| **Then**      | Repeat the same failing call to trigger the workflow circuit breaker                                                                                                                                                                              |

### Scenario 9.4 — 404 handling — SAFE ⬜

|           |                                                                            |
| --------- | -------------------------------------------------------------------------- |
| **Steps** | Request `/api/proxy/nonexistent-endpoint` and a nonexistent frontend route |
| **Watch** | Whether backend 404s propagate cleanly through the proxy or become 500s    |

---

## Group 10 — Developer Workflow

### Scenario 10.1 — Architecture gate — SAFE ✅

|                   |                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Steps**         | `pnpm architecture:check`                                                                                                                                                       |
| **Actual**        | ❌ **FAILS** — 25 violations (24 LOC growth/new files, 1 new cross-feature import)                                                                                              |
| **Learning goal** | Read `scripts/arch/check-loc.mjs` and its baseline. The baseline count is the real debt figure. Note this gate runs on pre-commit via Husky but **not in CI — there is no CI.** |

### Scenario 10.2 — Run the test suites — SAFE ✅

|                   |                                                                                                                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Actual**        | `@vibey/agent-policy` ✅ passes · `security:openclaw-workspaces:check` ✅ passes · `@vibey/api-shared` ❌ 2/119 fail · `@vibey/api` ❌ 36 files fail on one DI error · `@vibey/web` ❌ **all 981 files fail, 0 tests collected**                            |
| **Learning goal** | The web failure is one line: `apps/web/tests/setup.ts:9` imports `TextEncoder` from bare `'util'`, which under vitest+jsdom resolves to a browser shim without it. Reproduces on Node 20, 22, and 23. See [`12-existing-tests.md`](./12-existing-tests.md). |

### Scenario 10.3 — Trace one feature end to end — SAFE ⬜

|               |                                                                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective** | The single best use of a new developer's first day                                                                                                                                                                |
| **Steps**     | Pick Billing. Follow it from the settings component → the `fetch('/api/proxy/billing/...')` call → `proxy/[...path]/route.ts` → `BillingController` → `BillingService` → repository → table. Then find its tests. |
| **Reference** | The worked trace is in [`03-architecture.md`](./03-architecture.md) § Request Lifecycle                                                                                                                           |

---

## Coverage Summary

| Area                    | Scenarios |    Verified | Blocked |
| ----------------------- | --------: | ----------: | ------: |
| Startup & health        |         5 |           3 |       0 |
| Authentication          |         8 |           3 |       1 |
| Authorization & tenancy |         4 |           0 |       2 |
| CRUD                    |         4 |           0 |       0 |
| Core product loop       |         5 |           0 |       1 |
| Background processing   |         4 |           0 |       1 |
| Integrations            |         4 |           1 |       0 |
| Public surfaces         |         4 | 2 (partial) |       0 |
| Error conditions        |         4 |           0 |       0 |
| Developer workflow      |         3 |           2 |       0 |
| **Total**               |    **45** |      **11** |   **5** |

**The main gap is that nothing behind a login was exercised.** Every authenticated scenario is blocked on the same two things: test credentials, and confirmation that `sicxiwyukxtqicevlwuc` is a safe database to write to. Resolving that one question unblocks roughly 25 of these scenarios.
