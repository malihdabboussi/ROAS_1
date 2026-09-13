# Authentication, Authorization & Security Map

> Scope: read-only reverse-engineering of `ROAS-X-1DSLABS` (internal `vibey-v2`).
> Every claim below is tagged **CONFIRMED** (I read the code), **LIKELY** (strong
> inference from code, one hop of assumption), or **UNKNOWN**. No secret values
> are reproduced anywhere in this document.

## Executive Summary

- **Identity is Supabase GoTrue.** Access tokens are asymmetric JWTs verified
  against the project JWKS endpoint (`jose` + `createRemoteJWKSet`), _not_ against
  a shared `SUPABASE_JWT_SECRET`. `SUPABASE_JWT_SECRET` appears only in docs,
  templates and one stale compiled `.js` artifact — the live TypeScript path does
  not use it. This is the strongest part of the auth stack. **CONFIRMED**
- **There is no global `APP_GUARD`.** Zero matches repo-wide. Every NestJS route
  is protected only by whatever `@UseGuards(...)` its controller happens to
  declare. 20 of 336 controllers in `apps/api` declare none; most of those are
  webhooks/cron with their own signature or `CRON_SECRET` checks, which I
  verified individually. The pattern is fragile: forgetting one decorator ships
  an unauthenticated endpoint. **CONFIRMED**
- **RLS is not the security boundary; the app layer is.** 75 of 239 repositories
  in `apps/api` and 99 source files total use the service-role client, which
  bypasses RLS entirely. 223 files do inject the user-scoped client. The result
  is a _split_ boundary that is inconsistent per endpoint — and I found a
  confirmed cross-tenant hole on the service-role side. **CONFIRMED**
- **CRITICAL — cross-tenant org billing takeover.** `OrgRoleGuard` passes through
  when the `x-org-id` header is absent, while `OrgBillingCheckoutController` acts
  on the `:orgId` _path parameter_ using a service-role Stripe service. Any
  authenticated user can mint a Stripe customer-portal session for any org.
  **CONFIRMED**
- **CRITICAL — agent-api internal surface is guarded by a non-secret header.**
  `InternalAuthGuard` accepts any request carrying `x-openclaw-internal: true`,
  and the acting user/org identity is parsed out of an unsigned `x-session-key`
  string. `apps/agent-api` is published on the public internet by Fly. **CONFIRMED
  in code; production reachability NEEDS VERIFICATION.**
- **Impersonation is superadmin-only and audit-logged at the control plane — but
  the guard-level identity swap enforces neither the email allowlist nor the
  audit log.** A superadmin can impersonate any non-superadmin by sending a
  header directly, leaving no trail. **CONFIRMED**
- **Genuinely good:** the AES-256-GCM vault, PKCE on the MCP OAuth server, and
  webhook signature verification (Stripe, Meta, Slack, SendGrid, Composio,
  WordPress, Cursor) all use `timingSafeEqual` and are correctly implemented.
- **No committed secrets found.** `.env*` is gitignored; the only tracked env-ish
  files are `.example` templates and one file whose sole sensitive key is empty.

---

## Identity Provider

**Supabase GoTrue** (`lhfgtsjetcardinpgouq`, per `CLAUDE.md`). No second IdP.

| Concern         | Implementation                                             | Evidence                                                                  |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| Token format    | Supabase JWT, `aud: authenticated`                         | `packages/api-shared/src/services/supabase-jwt-verifier.service.ts:40-42` |
| Verification    | Remote JWKS (`/auth/v1/.well-known/jwks.json`), asymmetric | `supabase-jwt-verifier.service.ts:13,27-31,39-43`                         |
| Issuer pinning  | `${SUPABASE_URL}/auth/v1`                                  | `supabase-jwt-verifier.service.ts:40`                                     |
| Clock tolerance | 30 s                                                       | `supabase-jwt-verifier.service.ts:12`                                     |
| Social login    | `signInWithOAuth` → `/callback`                            | `apps/web/src/app/(auth)/login/page.tsx:67`                               |

`SUPABASE_JWT_SECRET` (symmetric HS256 verification) is **not** used by any live
TypeScript path. It appears in `AGENTS.md`, `scripts/roas/roas-secrets.env.template`,
planning docs, and `packages/api-shared/src/guards/auth.guard.js` — a stale
compiled artifact sitting next to the `.ts` source. **CONFIRMED**

> **NEEDS VERIFICATION:** `packages/api-shared/src/guards/auth.guard.js` and
> `.d.ts` live in `src/` alongside `auth.guard.ts`. If any consumer resolves the
> `.js` over the `.ts`, an older auth implementation would be in effect. I did
> not trace the build/resolution order.

---

## Session Lifecycle

| Stage           | What happens                                                                                                                                              | File                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Register        | UI calls Supabase directly. Public `/register` is **closed by default** — middleware redirects to `/login` unless `NEXT_PUBLIC_WAITLIST_MODE === 'false'` | `apps/web/src/middleware.ts:93-99`; `apps/web/src/app/(auth)/register/page.tsx` |
| Login           | `supabase.auth.signInWithPassword` in the browser                                                                                                         | `apps/web/src/app/(auth)/login/page.tsx:91`                                     |
| Session storage | `@supabase/ssr` cookies, set by the middleware's `setAll`                                                                                                 | `apps/web/src/middleware.ts:49-55`                                              |
| Cookie flags    | Delegated wholesale to `@supabase/ssr` defaults; no app-level `httpOnly`/`sameSite`/`secure` override anywhere                                            | `apps/web/src/lib/supabase/server.ts:15-21`                                     |
| Token → backend | Read via `getSession()`, sent as `Authorization: Bearer`                                                                                                  | `apps/web/src/lib/api/backend-client.ts:163-165, 451`                           |
| Refresh         | Client-side, proactive at exp − 120 s, plus a one-shot retry on any 401                                                                                   | `backend-client.ts:43-61, 167-170, 470-479`                                     |
| Logout          | `supabase.auth.signOut()` + clear org storage → marketing site                                                                                            | `apps/web/src/components/layout/AvatarAccountMenuPanel.tsx:89-94`               |
| Server expiry   | JWT `exp` enforced by `jose`; expired → `token_expired` → 401                                                                                             | `supabase-jwt-verifier.service.ts:56-58`                                        |

Two auth surfaces coexist: the web UI talks to Supabase directly, while
`apps/api` also exposes `/api/auth/{register,login,oauth,forgot-password}`
(throttled 3–10 req/min, Zod-validated, no guard by design). **CONFIRMED**
`apps/api/src/modules/auth/controllers/auth.controller.ts:11-66`

### Middleware behaviour (`apps/web/src/middleware.ts`)

Non-null assertions on `NEXT_PUBLIC_SUPABASE_URL!` / `ANON_KEY!` (lines 42-43) —
if unset, every matched request 500s. Each Supabase call is wrapped in
`withTimeout(..., 4000)` which **swallows errors and resolves `null`** (lines
21-27). Consequences:

- Supabase down → `user` is `null` → protected routes redirect to `/login`. This
  fails **closed** for authentication. Good.
- Profile/subscription/org-membership lookups that time out are treated as
  "access check unavailable" and handed to `resolveAccessStatus` (lines 186-229),
  and a failed `profiles` lookup returns the response unmodified (lines 167-169),
  i.e. the request proceeds. This fails **open** for _authorization_, but only
  for routing decisions — the backend re-checks everything. Acceptable.

Platform-admin routing (`/admin`) is checked here against `user_profiles.role`
(lines 140-146). That is a **UI routing** control only; the server-side control
is `RoleGuard` (see below).

---

## Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant MW as apps/web/src/middleware.ts
    participant SB as Supabase GoTrue
    participant BC as lib/api/backend-client.ts
    participant PX as app/api/proxy/[...path]/route.ts
    participant API as apps/api (NestJS)
    participant AG as api-shared AuthGuard
    participant PG as Postgres (RLS)

    B->>SB: signInWithPassword(email, password)
    SB-->>B: access_token + refresh_token (cookies via @supabase/ssr)

    B->>MW: GET /home
    MW->>SB: auth.getUser()  [4s timeout guard]
    SB-->>MW: user
    MW->>PG: user_profiles.role / profiles / org_members  [4s each]
    MW-->>B: 200, or 302 to /login | /onboarding | /no-org-access

    B->>BC: backendGet('/api/org/.../members')
    BC->>BC: getSession(); refresh if exp-120s
    BC->>PX: /api/proxy/org/... + Authorization + x-org-id + x-impersonate-user-id
    Note over PX: Proxy forwards the USER's JWT verbatim.<br/>It holds NO service-role key.
    PX->>API: /api/org/... (same headers)

    API->>AG: canActivate
    AG->>AG: @Public()? -> allow
    AG->>AG: x-internal-token == INTERNAL_API_TOKEN? -> service client as x-user-id
    AG->>SB: jwtVerify(token, JWKS, iss, aud)
    SB-->>AG: claims {sub, email}
    AG->>AG: x-impersonate-user-id? -> superadmin check -> mint target session
    AG-->>API: request.user, request.supabase (anon key + user JWT)

    API->>API: OrgContextGuard: x-org-id -> verify org_members active (service client)
    API->>API: OrgRoleGuard: orgRole >= @RequireOrgRole  [SKIPPED if no x-org-id]
    API->>PG: user client (RLS) OR service client (no RLS)
    PG-->>B: data
```

---

## Request Authorization Chain

| Hop                             | File                                                        | What it enforces                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Browser                      | `apps/web/src/lib/api/backend-client.ts:443-461`            | Attaches `Authorization`, `x-org-id` (from **localStorage**), `x-impersonate-user-id` (from **sessionStorage**)                                            |
| 2. Next middleware              | `apps/web/src/middleware.ts:38-251`                         | Route gating + redirects only. Not a security boundary — it does not run for `/api/proxy/*` auth decisions                                                 |
| 3. Proxy route                  | `apps/web/src/app/api/proxy/[...path]/route.ts:880-916`     | Forwards the user's Bearer token verbatim; picks platform vs agent backend; pins `fly-force-instance-id`                                                   |
| 4. `AuthGuard`                  | `packages/api-shared/src/guards/auth.guard.ts:53-127`       | JWKS verification; `@Public()` bypass; internal-token bypass; impersonation swap. Builds `request.supabase` from the **anon key + user JWT** → RLS applies |
| 5. `OrgContextGuard`            | `packages/api-shared/src/guards/org-context.guard.ts:26-66` | Reads `x-org-id`, verifies **active** `org_members` row via service client, sets `request.orgId/orgRole`                                                   |
| 6. `RoleGuard` / `OrgRoleGuard` | `role.guard.ts:39-117`, `org-role.guard.ts:49-81`           | Platform role and org-role hierarchy                                                                                                                       |
| 7. Controller                   | e.g. `org-invitations.controller.ts`                        | Zod param/body validation                                                                                                                                  |
| 8. Service/repository           | 75/239 repos service-role, rest user-scoped                 | Where tenancy is actually decided                                                                                                                          |
| 9. Postgres                     | 232 `CREATE POLICY` statements across migrations            | Backstop **only** on the user-client path                                                                                                                  |

**The proxy does not hold a service-role key.** It only ever holds
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and uses it with the caller's own JWT for a
`profiles` lookup (`route.ts:332-336`). Privilege escalation via the proxy is
prevented because it forwards the user's token unchanged and never mints one.
This is the correct design and worth preserving. **CONFIRMED**

---

## Where the Real Security Boundary Is

Blunt version: **RLS is a partial backstop, not the boundary. The boundary is the
NestJS guard stack plus per-service discipline — and that discipline is uneven.**

Evidence:

- 26 tables in `supabase/schema.sql` all have RLS enabled with policies, and 232
  `CREATE POLICY` statements exist across migrations. The policies I read are
  well-written (e.g. `org_invitations` restricts `FOR ALL` to active
  `owner`/`admin` members via `auth.uid()`).
  `supabase/migrations/20260327100000_create_organizations_foundation.sql:123-147`
- But every one of those policies also carries a
  `USING (auth.role() = 'service_role')` escape, and **99 source files in
  `apps/api` use the service-role client**, including 75 of 239 repositories.
  Anything reached through those paths has no database-level tenancy check at all.
- `OrgContextGuard` — the one place that actually proves org membership — uses the
  service client to do it (`org-context.guard.ts:43-48`). That is correct here
  (it must read a row the user may not be able to see), but it means org scoping
  depends entirely on that guard being present _and_ on the controller using
  `request.orgId` rather than a caller-supplied id.

Practical rule for this codebase: **if a handler injects `@Supabase()`, RLS is
your backstop and a scoping bug is usually contained. If it calls a service-role
repository, the guard chain is the only thing standing between tenants** — and
`OrgRoleGuard` silently no-ops when `x-org-id` is absent. Finding #2 is exactly
that combination.

---

## Roles & Permissions Model

Two independent role systems.

| Role                                                                     | Where defined                                            | Enforced where                                                                                      | Notes                                                                                                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `user` / `power` / `admin` / `enterprise` / `superadmin` (platform)      | `packages/api-shared/src/guards/role.guard.ts:12`        | `RoleGuard` via `@Roles()`, reading `user_profiles.role` with the **service client**                | `superadmin` and `admin` short-circuit to allow-all (`role.guard.ts:91,101`). `@Roles('superadmin')` correctly rejects `admin` (lines 94-98) |
| `owner`(5) / `admin`(4) / `creator`(3) / `editor`(2) / `viewer`(1) (org) | `packages/api-shared/src/guards/org-role.guard.ts:27-32` | `OrgRoleGuard` via `@RequireOrgRole()`, numeric hierarchy compare                                   | **Pass-through when `request.orgId` is null** (lines 63-65). 63 usages across `apps/api` + `apps/agent-api`                                  |
| `ai_data_admin` (boolean)                                                | `org_members` column                                     | `OrgContextGuard` sets `request.organizationWideDataAccess` when role is `owner` or the flag is set | `org-context.guard.ts:62-63`                                                                                                                 |
| Platform-admin UI gate                                                   | `apps/web/src/middleware.ts:140-146`                     | Middleware redirect only                                                                            | **Frontend-only.** Backed server-side by `RoleGuard` on admin controllers, which I spot-checked on `ImpersonationController`                 |

`RoleGuard` fails **open to `user`** when the profile lookup errors or the profile
is missing, but only if `'user'` is among the required roles (`role.guard.ts:76-85`).
That is a deliberate, bounded degradation — not a bypass for `admin` routes.

**Frontend-only permission checks:** `apps/web/src/features/team-2/hooks/use-team2-perms.ts`
and ~20 components branch on org role to hide UI. These are cosmetic. I did not
find a case where a _destructive_ action was gated only client-side, but I did
not exhaustively pair every UI gate with its endpoint — treat this as
**LIKELY-clean, NEEDS VERIFICATION**.

---

## Multi-Tenant Isolation

Tenant is resolved from the **`x-org-id` request header**, set by the browser from
`localStorage` (`backend-client.ts:420,455`). The header itself is untrusted, and
`OrgContextGuard` correctly treats it that way: it looks up an **active**
`org_members` row for `(orgId, request.user.id)` and 403s otherwise
(`org-context.guard.ts:43-57`). **A user cannot claim membership in an org they
do not belong to.** That part is sound.

The isolation gaps are downstream of that check:

| #   | Pattern                                                                                                                                                 | Where                                                                                                                                                                          | Risk                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| T1  | `OrgRoleGuard` returns `true` when `request.orgId` is null                                                                                              | `packages/api-shared/src/guards/org-role.guard.ts:63-65`                                                                                                                       | Omitting `x-org-id` skips **every** `@RequireOrgRole` check                                                                       |
| T2  | 38 controller handlers take org id from the `:orgId` **path param**; only `agent-feedback.service.ts:158` has anything resembling an `assertOrgMatches` | `rg "@Param('orgId')" apps/api/src`                                                                                                                                            | Path param is never cross-checked against the membership-verified `request.orgId`                                                 |
| T3  | T1 + T2 + service-role service = confirmed cross-tenant access                                                                                          | `apps/api/src/modules/org/controllers/org-billing-checkout.controller.ts:30,61,86,98` → `org-stripe.service.ts:13,25`                                                          | See Finding #2                                                                                                                    |
| T4  | `org_id` accepted from the request **body**                                                                                                             | `apps/api/src/modules/internal/**`, `apps/api/src/modules/missions/services/mission-internal*.ts`, `apps/api/src/modules/leads/controllers/internal-contacts.controller.ts:48` | Acceptable _only_ because these sit behind `x-internal-token` / `CRON_SECRET`. Their safety is inherited entirely from Finding #4 |
| T5  | `org_id` from body on `agent-api`                                                                                                                       | `apps/agent-api/src/modules/task-agent/controllers/agents-automation.controller.ts:25,38,51`, `task-agent.controller.ts:45`                                                    | Behind `ChannelServiceGuard` (`x-internal-token`). Same inherited risk                                                            |
| T6  | `org_id` parsed from an unsigned session-key string                                                                                                     | `apps/agent-api/src/modules/artifacts/services/artifact-session-key-parser.service.ts:80-105`                                                                                  | See Finding #1                                                                                                                    |

Where a handler injects `@Supabase()` (223 files), T1/T2 are contained by RLS —
I verified this concretely for `org-invitations.controller.ts`, whose
`inviteMember`/`listInvitations` run on the user client against a policy that
requires an active `owner`/`admin` membership. The exposure is specifically the
service-role subset.

---

## Impersonation

**Control plane** — `apps/api/src/modules/admin/controllers/impersonation.controller.ts`
and `services/impersonation.service.ts`. Well built:

- `@UseGuards(AuthGuard, RoleGuard) @Roles('superadmin')` on the whole controller
  (`impersonation.controller.ts:20-21`).
- Hard-coded two-address email allowlist; targets outside it are neither listed
  nor startable (`impersonation.service.ts:29-33, 99-101, 136-138`).
- Superadmins cannot be impersonated; self-impersonation rejected
  (`impersonation.service.ts:82-84, 96-98`).
- Every start/stop writes to `superadmin_audit_log` with IP + user-agent, and a
  **failed audit write aborts the operation** (`impersonation.service.ts:176-188`).
- `AuthGuard` deliberately never applies the identity swap on
  `/admin/impersonation` paths, so "stop" still authenticates as the real
  superadmin (`auth.guard.ts:23, 93-94`).

**Data plane** — `AuthGuard.applyImpersonation` (`auth.guard.ts:138-205`). When a
verified superadmin sends `x-impersonate-user-id`, the guard mints a **real
GoTrue session** for the target via `admin.generateLink('magiclink')` +
`verifyOtp` (`user-session-mint.service.ts:109-141`) and rebuilds
`request.supabase` as a user-scoped client. `auth.uid()`, RLS and
`SECURITY DEFINER` RPCs all see the target natively — a genuinely elegant design
that avoids sprinkling service-role access through impersonated requests.

**The gap:** the guard-level swap checks only (a) caller role is `superadmin` and
(b) target is not a superadmin. It does **not** consult `ALLOWED_CLIENT_EMAILS`,
and it does **not** write to `superadmin_audit_log`. Calling `/start` first is a
UI convention, not an enforced precondition — the header alone triggers the swap.

The browser stores the target in `sessionStorage` and attaches the header to
every request (`apps/web/src/lib/utils/impersonation-storage.ts:1-33`;
`backend-client.ts:124-128, 456`). The proxy strips it only for
`/api/admin/impersonation*` (`route.ts:889-896`).

---

## Secrets & Vault

`apps/api/src/modules/vault/services/vault.service.ts`. **AES-256-GCM, correctly
implemented.**

- Key: `VAULT_ENCRYPTION_KEY`, required to be exactly 64 hex chars → 32 bytes.
  Anything else yields `null` and every operation throws
  `Vault encryption is not configured` (lines 31-42). **No derivation, no KDF** —
  the env var _is_ the key. Fine for a high-entropy random key; catastrophic if
  someone sets a passphrase, which the regex correctly refuses.
- Fresh 12-byte IV per encryption (line 47); auth tag stored and verified
  (lines 50, 64).
- Format `iv:authTag:ciphertext`, all hex (line 51).
- **No key id / version in the envelope.** Rotating `VAULT_ENCRYPTION_KEY` makes
  every stored secret permanently undecryptable — GCM auth-tag verification will
  throw on `final()`, not return garbage, so failures are loud rather than silent.
  There is no re-encryption path and no dual-key read window. **CONFIRMED**
- The same key must be byte-identical across `apps/api`, `apps/agent-api` and
  `apps/queue-worker` (`apps/queue-worker/src/lib/services/vault-decrypt.ts`;
  `AGENTS.md` calls this out explicitly). A mismatch surfaces as decryption
  errors on integration calls, not as a security failure.

**Committed secrets:** none found.

- `.gitignore:16-17,22-24,47,53-54,137-138,143` covers `.env`, `.env*.local`,
  `.env*`, `scripts/roas/roas-secrets.env`, `docker/.env.docker`.
- `git ls-files` surfaces only `.example` templates plus two real files:
  - `.vercel-env` — 8 bytes, no `KEY=` assignments.
  - `apps/openclaw/openclaw.podman.env` — declares `OPENCLAW_GATEWAY_TOKEN`,
    `OPENCLAW_PODMAN_GATEWAY_HOST_PORT`, `OPENCLAW_PODMAN_BRIDGE_HOST_PORT`,
    `OPENCLAW_GATEWAY_BIND`. **`OPENCLAW_GATEWAY_TOKEN` has an empty value**
    (verified by measuring length without printing). No risk.
- A `git grep` for JWT / `sk-` / `xoxb-` shaped values assigned to
  `*_KEY|*_SECRET|*_TOKEN|*PASSWORD` across all tracked files returned nothing.
- `git log --oneline -5 -- '*.env'` shows one commit,
  `3e9002fd Initial ROAS platform snapshot`, touching only the files above.
  **NEEDS VERIFICATION:** I did not walk full history for since-deleted `.env`
  files.

---

## OAuth / Integration Credentials

| Flow                                 | State / CSRF                                                                                                              | Evidence                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| MCP OAuth server (Vibey as provider) | **Full PKCE S256**, `code_challenge` ≥ 32 chars enforced by Zod, verifier compared with `safeCompare` → `timingSafeEqual` | `apps/api/src/modules/mcp/services/mcp-oauth.service.ts:65,258,380-389`; `dto/mcp-oauth.dto.ts:7-8`; `mcp-oauth-crypto.util.ts:21` |
| OpenAI Codex                         | HMAC-signed state, `timingSafeEqual`                                                                                      | `apps/api/src/modules/integrations/openai-codex/services/openai-codex-oauth.service.ts:1,193`                                      |
| Higgsfield                           | HMAC-signed state + length check + `timingSafeEqual`                                                                      | `apps/api/src/modules/integrations/higgsfield/higgsfield-oauth.service.ts:1,259`                                                   |
| Slack                                | `state` required at the controller; validation delegated to `slackService.handleOAuthCallback(code, state)`               | `apps/api/src/modules/slack/controllers/slack-oauth.controller.ts:12-16`                                                           |
| Meta                                 | `state` required at the controller; validated in `oauth.handleCallback`                                                   | `apps/api/src/modules/integrations/meta/controllers/meta.controller.ts:94-100`                                                     |

Tokens land in the AES-GCM vault. **NEEDS VERIFICATION:** I confirmed Slack and
Meta _require_ a state parameter but did not read their `handleCallback`
internals to confirm the state is cryptographically bound to the initiating user
(as Codex and Higgsfield demonstrably are). Worth a follow-up read.

### Webhook signature verification — all verified, all constant-time

| Provider                  | File:line                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Stripe                    | `billing-webhook.controller.ts:22-33` (delegates to `stripeService.handleWebhookEvent(rawBody, signature)`) |
| Meta                      | `meta-integration-fetch-webhook.base.ts:312,333`                                                            |
| Slack                     | `slack-api-integration-core.base.ts:1`                                                                      |
| SendGrid                  | `email/controllers/webhooks.controller.ts:17-34`                                                            |
| Composio                  | `integrations-composio-webhook.service.ts:170`                                                              |
| WordPress                 | `wordpress/services/wordpress.service.ts:364`                                                               |
| Cursor                    | `cursor/integrations/cursor.integration.ts:55`                                                              |
| Space webhooks (outbound) | `spaces/services/space-webhooks.service.ts:293`                                                             |

Cron-triggered internal endpoints use `Bearer ${CRON_SECRET}` (e.g.
`meeting-action-reconciliation.controller.ts:14-16`,
`space-automation-scheduler-internal.controller.ts`,
`billing-credit-alert-internal.controller.ts`) — verified present, but compared
with `!==` (see Finding #4).

---

## Agent Runtime Security (OpenClaw)

**What actually isolates tenants: one Fly machine per user, not in-process
sandboxing.** The proxy resolves the caller's `fly_machine_id` from `profiles` and
pins every agent request with `fly-force-instance-id`
(`apps/web/src/app/api/proxy/[...path]/route.ts:479-483`). The code comment at
`route.ts:246-266` states the reasoning explicitly: without the pin, Fly would
route to an arbitrary machine in the pool — _"or worse, another user's machine →
cross-tenant data leak."_ Only users with no machine yet fall back to the
unpinned `AGENT_BACKEND_URL`, and only for provisioning. **CONFIRMED**

Impersonated agent traffic resolves the _target's_ machine through a
superadmin-only, allowlist-enforced backend endpoint rather than trusting the
proxy (`route.ts:273-290` → `impersonation.service.ts:131-157`). Good design.

**Filesystem sandboxing** is enforced by a CI-style check,
`scripts/security/check-openclaw-workspaces.mjs`, run as
`security:openclaw-workspaces:check` (`package.json:32`). It parses
`docker/openclaw.json` and fails the build if any `agents.defaults.workspace` or
`agents.list[].workspace` is not under `${AGENTS_BASE_DIR}/` or `/app/agents/`,
with explicit rejections for `/Users/`, `C:\Users\`, and `/home/`
(lines 19-73). All ~20 configured agent workspaces conform
(`docker/openclaw.json:763-1491`). This prevents an agent config from being
pointed at a host home directory. It does **not** sandbox agents from each other
within a machine — but since the machine is single-tenant, that is a defensible
trade-off. **CONFIRMED**

**Tool authorization** is the weak link: OpenClaw's `vibey_backend` tool posts to
`agent-api` with `x-openclaw-internal: true` and an `x-session-key` from which
the acting user/org/space/campaign are regex-extracted. Nothing signs that key.
See Finding #1.

---

## Service-to-Service Auth

| Link                             | Credential                        | Header                            | Constant-time?                        |
| -------------------------------- | --------------------------------- | --------------------------------- | ------------------------------------- |
| web → api / agent-api            | User's Supabase JWT (forwarded)   | `Authorization`                   | n/a (JWKS signature)                  |
| web proxy → Vercel-protected api | `VERCEL_AUTOMATION_BYPASS_SECRET` | via `applyVercelProtectionBypass` | UNKNOWN                               |
| api ↔ agent-api ↔ workers        | `INTERNAL_API_TOKEN`              | `x-internal-token` (or `Bearer`)  | **No** — `!==`                        |
| Vercel Cron → api                | `CRON_SECRET`                     | `Authorization: Bearer`           | **No** — `!==`                        |
| agent-api → OpenClaw gateway     | `OPENCLAW_GATEWAY_TOKEN`          | gateway auth                      | UNKNOWN                               |
| OpenClaw plugin → agent-api      | **none**                          | `x-openclaw-internal: true`       | n/a                                   |
| api → project sandbox SDK        | `VIBEY_SESSION_KEY` HMAC          | `x-vibey-session-key`             | **Yes** — `project-session-key.ts:27` |

Comparison sites using `!==`: `auth.guard.ts:74`, `channel-service.guard.ts:11`,
`runtime-identity.guard.ts:29`, `space-automations-internal.controller.ts:31`,
`drive-sync-internal.controller.ts:26`, `meeting-action-reconciliation.controller.ts:15`.

The `AuthGuard` internal-token branch is the most powerful of these: presenting a
valid `x-internal-token` plus an arbitrary `x-user-id` yields
`request.user = { id: <anything> }` **and** `request.supabase = service client`
— i.e. any identity with RLS off (`auth.guard.ts:68-79`).

---

## Security Findings

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Severity     | Evidence (file:line)                                                                                                                                                                                                                                         | Why it matters                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **agent-api internal API is authenticated by a static, non-secret header.** `InternalAuthGuard` allows any request with `x-openclaw-internal: true`. Acting identity comes from the unsigned `x-session-key`, regex-parsed for `userId`/`orgId`/`spaceId`/`campaignId`. Protects `POST /api/artifacts`, `/api/artifacts/stream`, `/api/artifacts/openclaw/{chat-completions,responses}`, `/api/agents/{sync,instruction-repair,:key/register}`, `/api/sessions/{transcript,store}/*`, `/api/internal/admin-skill-builder/chat`, `/api/agents/runtime-skills/read`. Fly publishes the app on 443 with no IP allowlist and `enableCors({origin:true})`. | **CRITICAL** | `apps/agent-api/src/modules/artifacts/guards/internal-auth.guard.ts:22-26`; `artifacts.controller.ts:33-34,44-47`; `artifact-session-key-parser.service.ts:14-45,80-105`; `docker/fly.roas.runtime.toml:16-18`; `apps/agent-api/src/main.ts:90-92`           | Anyone who can reach `roas-runtimes.fly.dev` can execute artifact/agent actions as any user in any org by forging a session key. No secret required. **CONFIRMED in code; production reachability NEEDS VERIFICATION** (a WAF or Fly private-network restriction outside this repo could blunt it).          |
| 2   | **Cross-tenant org billing takeover.** `OrgRoleGuard` no-ops when `request.orgId` is null; `OrgBillingCheckoutController` acts on the `:orgId` path param via `OrgStripeService`, which uses the **service-role** client. Omitting `x-org-id` skips `@RequireOrgRole('owner')` entirely.                                                                                                                                                                                                                                                                                                                                                              | **CRITICAL** | `packages/api-shared/src/guards/org-role.guard.ts:63-65`; `org-billing-checkout.controller.ts:26,30-31,60-61,86-95,98-107`; `org-stripe.service.ts:13,25,145-169`                                                                                            | `POST /api/org/<any-org>/billing/portal` returns a Stripe customer-portal URL for an arbitrary organization — payment methods, invoices, cancellation. `GET .../billing/invoices` leaks billing history. `POST .../billing/checkout` and `.../purchase-credits` act on another tenant. **CONFIRMED.**        |
| 3   | **`OrgRoleGuard` pass-through + unvalidated `:orgId` path param, systemically.** 38 handlers read org id from the path; only one service does anything like `assertOrgMatches`. No handler compares `params.orgId` to the membership-verified `request.orgId`.                                                                                                                                                                                                                                                                                                                                                                                        | **HIGH**     | `org-role.guard.ts:63-65`; `rg "@Param('orgId')" apps/api/src` (38 hits); `agent-feedback.service.ts:158` (the lone counter-example)                                                                                                                         | Finding #2 is one instance. Handlers that inject `@Supabase()` are contained by RLS — I verified this for `org-invitations.controller.ts` against the `org_invitations` policy. Every service-role-backed one is a candidate. **CONFIRMED as a design gap; per-endpoint exploitability NEEDS VERIFICATION.** |
| 4   | **Shared service secrets compared with `!==`, and the `AuthGuard` internal-token branch grants arbitrary identity + service-role client.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **HIGH**     | `packages/api-shared/src/guards/auth.guard.ts:68-79`; `channel-service.guard.ts:11`; `runtime-identity.guard.ts:29`; `space-automations-internal.controller.ts:31`; `drive-sync-internal.controller.ts:26`; `meeting-action-reconciliation.controller.ts:15` | The blast radius, not the timing attack, is the problem: one leaked `INTERNAL_API_TOKEN` means "become any user, RLS off, everywhere". Non-constant-time comparison is a real but secondary weakness over a network.                                                                                         |
| 5   | **No global `APP_GUARD`; auth is opt-in per controller.** 20/336 `apps/api` controllers declare no guard.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **MEDIUM**   | `rg APP_GUARD apps` → 0 matches; unguarded list incl. `auth.controller.ts`, `funnels/preview.controller.ts`, `unsubscribe.controller.ts`, all webhook/cron controllers                                                                                       | I checked each of the 20: all are intentionally public or carry their own signature/`CRON_SECRET`/session-key check. The finding is the _pattern_ — a forgotten decorator on a new controller ships unauthenticated, with nothing to catch it.                                                               |
| 6   | **Guard-level impersonation bypasses the allowlist and the audit log.** `applyImpersonation` requires only `role === 'superadmin'` and a non-superadmin target; it never checks `ALLOWED_CLIENT_EMAILS` and never writes `superadmin_audit_log`.                                                                                                                                                                                                                                                                                                                                                                                                      | **MEDIUM**   | `auth.guard.ts:138-205` vs. `impersonation.service.ts:29-33,99-101,176-188`                                                                                                                                                                                  | A superadmin can impersonate **any** non-superadmin user by sending the header without calling `/start`, leaving no trail. Requires an already-trusted superadmin, so this is an insider-accountability gap rather than an external break.                                                                   |
| 7   | **`@Public()` on invitation lookup by token.** `GET /api/org/invitations/:token` returns invitation details unauthenticated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **LOW**      | `org-invitations.controller.ts:148-154`                                                                                                                                                                                                                      | Standard for invite flows and the token is the capability. Confirm the token is high-entropy and single-use. **NEEDS VERIFICATION** — I did not read the token generator.                                                                                                                                    |
| 8   | **Debug exfiltration snippet shipped in the web client bundle.** `backendGet` POSTs path, status, and a 200-char response-body preview to a hard-coded local ingest endpoint whenever the path contains `usage-analytics` or `agent-spending`.                                                                                                                                                                                                                                                                                                                                                                                                        | **LOW**      | `apps/web/src/lib/api/backend-client.ts:588-592`                                                                                                                                                                                                             | Destination is `127.0.0.1:7681`, so nothing leaves the user's machine and it fails closed. It is leftover agent instrumentation with a hard-coded session UUID that should not be in production code.                                                                                                        |
| 9   | **Stale compiled `auth.guard.js` / `.d.ts` next to `auth.guard.ts` in `packages/api-shared/src/`.** The `.js` references `SUPABASE_JWT_SECRET`, which the `.ts` does not.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **LOW**      | `packages/api-shared/src/guards/auth.guard.js`                                                                                                                                                                                                               | If any resolution path ever prefers the `.js`, a different (symmetric-secret) auth implementation silently takes effect. Ambiguity in an auth path is worth eliminating regardless. **NEEDS VERIFICATION** of build resolution.                                                                              |

---

## What Is Done Well

These are not consolation prizes — they are above the norm for a codebase this size.

1. **Asymmetric JWT verification via JWKS.** No shared symmetric secret in the
   verification path, correct `issuer`/`audience` pinning, bounded clock
   tolerance, and error classification that distinguishes "invalid token" (401)
   from "Supabase unreachable" (503) so an upstream outage never reads as a
   forged token. `supabase-jwt-verifier.service.ts:34-87`
2. **The proxy holds no elevated credential.** It forwards the user's token
   verbatim and uses only the anon key. The single most common way to build this
   layer badly was avoided. `route.ts:332-336`
3. **Impersonation via real minted GoTrue sessions.** Rather than bolting
   "act-as" logic onto service-role queries, the guard mints an actual session so
   RLS, `auth.uid()` and `SECURITY DEFINER` RPCs all behave natively. Combined
   with a controller-level email allowlist and abort-on-audit-failure logging,
   this is a thoughtful design. `auth.guard.ts:138-205`; `user-session-mint.service.ts:109-141`
4. **Vault crypto is textbook.** AES-256-GCM, per-encryption random IV, auth tag
   stored and verified, strict 32-byte key validation that refuses passphrases.
   `vault.service.ts:31-65`
5. **Webhook verification is universal and constant-time.** Eight providers,
   `timingSafeEqual` in every one. No "TODO: verify signature" anywhere.
6. **Per-user runtime machines with explicit instance pinning**, and a code
   comment that names the exact cross-tenant failure mode being defended against.
   `route.ts:246-266,479-483`
7. **An executable workspace-path guard** (`check-openclaw-workspaces.mjs`) rather
   than a documented convention.
8. **Auth endpoints are throttled** (register 5/min, login 10/min,
   forgot-password 3/min) and Zod-validated. `auth.controller.ts:13,25,54`

---

## Open Questions

1. **Is `roas-runtimes.fly.dev` reachable from the public internet?**
   `[http_service]` in `docker/fly.roas.runtime.toml` says yes and I found no
   in-app IP restriction, but a Fly org-level network policy or an upstream WAF
   would change Finding #1's severity. This is the single highest-value thing to
   confirm.
2. **Do Slack and Meta bind their OAuth `state` to the initiating user?** Both
   require the parameter; I did not read `handleOAuthCallback` internals. Codex
   and Higgsfield demonstrably do (HMAC + `timingSafeEqual`).
3. **How many of the 38 `:orgId` path-param handlers sit on service-role
   services?** I confirmed one family (org billing). A full enumeration is needed
   to size Finding #3.
4. **Which `.js`/`.ts` wins for `packages/api-shared/src/guards/auth.guard`?**
5. **Are invitation tokens high-entropy and single-use?** Relevant to Finding #7.
6. **Is `OPENCLAW_GATEWAY_TOKEN` compared in constant time inside the vendored
   OpenClaw gateway?** I scoped OpenClaw internals out of this pass.
7. **What are the Supabase session cookie flags in production?** Entirely
   `@supabase/ssr` defaults; no app-level override exists to inspect.
8. **Is there a `VAULT_ENCRYPTION_KEY` rotation runbook?** The current envelope
   has no key id, so rotation is a one-way data-loss event.
