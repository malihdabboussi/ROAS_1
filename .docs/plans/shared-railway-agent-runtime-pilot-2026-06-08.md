# Shared Railway Agent Runtime Pilot Plan

Date: 2026-06-08
Status: Pre-deploy implementation complete
Pilot user: `sefy@olympus-digital.com`

## TLDR

Build a one-user pilot by changing Sefy's runtime target in the database, not by hardcoding an email allowlist or adding pilot feature flags. The web proxy should read the same profile row that currently owns `fly_machine_id`; if the profile says `agent_runtime_type=shared_railway`, proxy to the Railway runtime URL. If the profile says `fly_machine` or has no runtime override, keep the current Fly.io per-user Machine path.

Keep Sefy's existing `fly_machine_id` on the profile as the stopped fallback. Moving Sefy to Railway should be one DB update, and rolling back should be one DB update.

Do not move all users yet. The required blocker to solve first is not Railway itself. The blocker is tenant-safe local OpenClaw state: personal agent workspaces and OpenClaw agent IDs currently are not user-scoped, so a shared runtime can collide between users unless we add user-scoped workspace IDs before routing personal chats to it.

## Pre-Deploy Implementation Status

Completed in code, not deployed:

- Added profile runtime target columns through migration `20260608085648_agent_runtime_profile_targets.sql`.
- Extended profile runtime helpers with `agent_runtime_type` / `agent_runtime_url` and staging equivalents.
- Updated the web proxy to route profile-targeted users to shared Railway without Fly wake or `fly-force-instance-id`.
- Kept Fly as the pre-stream fallback path through the existing `fly_machine_id`.
- Added shared Agent API mode with `AGENT_RUNTIME_MODE=shared`.
- Added user-scoped personal OpenClaw IDs and workspaces: `user-{userId}-{agentKey}` and `AGENTS_BASE_DIR/users/{userId}/{agentKey}`.
- Added user-scoped artifact/tool policy loading from the same workspace.
- Added a process-local OpenClaw config mutation queue for single-replica concurrent materialization.
- Added Railway config at `apps/agent-api/railway.json`.
- Added proxy runtime logs for target selection, shared fetch start/headers/failure, Fly fallback start/headers, first upstream chunk, and stream completion.

2026-06-22 public widget latency follow-up:

- Cloudflare `apps-proxy` now applies the same profile/org runtime target decision to public widget `/api/public-chat` and `/api/public-chat/prewarm` requests.
- Shared runtime targets are accepted only from trusted `.up.railway.app` HTTPS URLs, and shared-runtime requests do not forward `fly-force-instance-id`.
- Public widget conversations can prewarm stable chat context before the visitor sends, using the same owner/credit checks as the send path.
- Public-agent greetings and meta prompts use a fast scoped agent context instead of paying full Brain retrieval when no task-specific context is needed.
- Full Brain retrieval now honors the agent policy's allowed Brain families before querying user, company, agent, or customer context.
- Public widget responses persist `timing_spans` in assistant metadata and send them in the terminal stream payload so production traces can separate controller, stable context, Brain context, gateway input, first visible output, and model stream time.

Verified locally:

```bash
pnpm --filter @vibey/web test 'src/app/api/proxy/[...path]/route.test.ts'
pnpm --filter @vibey/web typecheck
pnpm --filter @vibey/agent-api test src/modules/shared/agent-runtime.service.test.ts src/modules/agent-sync/services/agent-runtime-readiness.service.test.ts src/modules/shared/openclaw-gateway.service.test.ts src/health.controller.test.ts src/modules/agent-sync/services/agent-sync.shared-runtime.test.ts src/modules/shared/vibey-backend-plugin.test.ts
pnpm --filter @vibey/agent-api typecheck
```

Additional 2026-06-22 public widget verification:

```bash
pnpm --filter @vibey/agent-api exec vitest run src/modules/public-agent/public-chat.controller.test.ts src/modules/brain/services/brain-context.service.test.ts src/modules/chat/services/chat.service.access-context.test.ts
pnpm --filter @vibey/web exec vitest run src/features/public-agent/__tests__/public-agent-sse.test.ts
pnpm exec vitest run workers/apps-proxy/src/index.test.ts
pnpm --filter @vibey/agent-api exec tsc --noEmit
pnpm --filter @vibey/web exec tsc --noEmit
pnpm exec tsc --noEmit -p workers/apps-proxy/tsconfig.json
git diff --check
```

Next step: deploy one Railway service from the existing Docker runtime image, keep replicas at `1`, disable Serverless/App Sleeping, verify `/api/health` and `/api/health/deep`, then update only Sefy's profile row.

## Exact Request

Create an implementation plan for a testing phase where:

- One user, `sefy@olympus-digital.com`, is moved to the new shared service.
- Timing is measured end to end.
- If the test works, more users can be moved later.
- Current Fly.io per-user Machines remain available as backup, but stopped.
- The target architecture for the test is Railway service plus Agent API plus OpenClaw plus Redis, while avoiding a full migration until the pilot proves safety and latency.
- Runtime selection should be DB-driven: one user can move from Fly to Railway without a hardcoded email allowlist.

## Recommendation

Use this phased pilot:

1. Add profile-level runtime target fields next to the existing Fly Machine fields.
2. Teach the web proxy to resolve the runtime target from the profile row.
3. Deploy one always-on Railway replica with the existing Docker runtime image.
4. Add shared-runtime mode to Agent API so startup no longer requires one machine-level `USER_ID`.
5. Add user-scoped personal OpenClaw workspaces before routing personal chats.
6. Update Sefy's profile row to `agent_runtime_type=shared_railway` and `agent_runtime_url=<railway-url>`.
7. Measure proxy timing, runtime readiness timing, first upstream byte, and fallback frequency.
8. Keep the existing Fly wake path unchanged and use it as fallback through Sefy's existing `fly_machine_id`.

Why this recommendation:

- It tests the real product path with one real user.
- It removes the current chat cold-start tax for the pilot user.
- It does not force a full architecture migration before proving correctness.
- It keeps rollback simple: update one DB row and Sefy returns to Fly.
- It exposes the real blocker, OpenClaw local state isolation, before multiple users are sharing one process.

## Current System Evidence

### Web proxy routing

- `apps/web/src/app/api/proxy/[...path]/route.ts` is the current control point for chat/runtime routing.
- Agent paths are identified as `chat`, `apps`, `project-files`, and `brain/live-session`.
- Chat uses a special warmup path through `proxyChatWithWarmup`.
- `requiredRuntimeForAgentPath` maps `/api/chat` to `chat` and other agent paths to `work`.
- `resolveAgentInfo` currently:
  - reads the Supabase profile for the authenticated user,
  - wakes the user's Fly Machine through `/api/proxy/machines/ensure-running`,
  - returns the Fly Machine URL and `machineId`,
  - pins the request with `fly-force-instance-id`.
- The file has an explicit safety rule: once a user has `fly_machine_id`, the proxy must pin requests to that machine and must not fall back to unpinned app routing because that can leak across tenants.
- There is no existing `runtime_assignment` or `agent_runtime` table in the repo. Runtime routing is currently profile-machine based.

Implication: the pilot should extend the existing profile-machine resolution into profile-runtime resolution. Shared Railway routing must never set `fly-force-instance-id`. For fallback, the current Fly path remains the source of truth through the existing `fly_machine_id`.

### Profile runtime column helper

- `apps/web/src/lib/runtime/machine-profile-env.ts` resolves environment-specific profile machine columns for the web proxy.
- `packages/api-shared/src/services/machine-profile-env.ts` provides the same machine column mapping for backend services.
- Existing production columns are `fly_machine_id`, `fly_machine_url`, `fly_machine_status`, `fly_runtime_app`, `fly_runtime_status`, and `fly_runtime_last_activity_at`.
- Existing staging columns mirror those names with `_staging`.

Implication: profile-level runtime target fields should follow this existing profile-column pattern instead of creating an unrelated allowlist system.

### Agent API auth and request identity

- `packages/api-shared/src/guards/auth.guard.ts` validates the Supabase bearer token.
- The guard sets `request.user = { id: claims.sub, email: claims.email }`.
- Chat controllers already use request-scoped `user.id`, token, and org context.
- `apps/agent-api/src/modules/chat/controllers/chat.controller.ts` uses `AuthGuard`, `OrgContextGuard`, `OrgRoleGuard`, `CreditsGuard`, and `SyncReadyInterceptor`.

Implication: a shared Railway Agent API can authenticate the same forwarded browser token. We do not need per-user infrastructure for authentication. The harder part is runtime state isolation.

### OpenClaw runtime identity and workspace state

- `apps/agent-api/src/modules/shared/agent-runtime.service.ts` currently returns:
  - org agents as `org-{orgId}-{agentKey}`,
  - personal agents as just `{agentKey}`.
- `buildChatSessionKey` includes `gatewayAgentId`, `userId`, `conversationId`, and optional `orgId`, so the session key is better scoped than the personal OpenClaw agent ID.
- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts` currently writes personal agent workspaces under `AGENTS_BASE_DIR/{agentKey}`.
- The same service writes org agent workspaces under `AGENTS_BASE_DIR/orgs/{orgId}/{agentKey}`.
- `apps/agent-api/src/modules/shared/openclaw-gateway.service.ts` can map org agent IDs back to org workspace paths, but personal agent IDs still resolve to `AGENTS_BASE_DIR/{agentId}`.

Implication: org chats are already mostly tenant-scoped. Personal chats are not safe on a shared runtime until personal agent IDs and workspaces become user-scoped.

### Agent sync startup

- `AgentSyncService.bootstrapAsync` currently expects a machine-level `USER_ID` or resolves one from Fly Machine identity.
- `apps/agent-api/src/health.controller.ts` currently treats runtime readiness as dependent on `syncService.isUserIdResolved()`.
- `SyncReadyInterceptor` waits for sync readiness before chat endpoints proceed.

Implication: Railway shared runtime needs a new shared mode where startup readiness does not mean "one user is bound to this machine". Instead, startup readiness should mean "gateway/auth are alive, and per-request sync can materialize the user/org agent on demand".

### Artifact tool calls

- `docker/tools/vibey-backend/index.ts` calls Agent API inside the same container at `http://localhost:3003` by default.
- It sends `x-openclaw-internal: true` and `x-session-key`.
- `apps/agent-api/src/modules/artifacts/controllers/artifacts.controller.ts` accepts internal OpenClaw artifact calls and resolves user/org context from request metadata/session.

Implication: artifacts can continue as chat tool calls inside the same Railway container, but user-scoped personal OpenClaw IDs must also be understood by the vibey backend plugin when it loads `ALLOWED_ACTIONS.json`.

### Docker/runtime deploy surface

- `docker/Dockerfile` already builds a production runtime image containing Agent API, OpenClaw gateway, Chromium, ffmpeg, yt-dlp, seeded system agents, and the vibey backend plugin.
- `docker/supervisord.conf` already starts `agent-api` and `openclaw-gateway`.
- Agent API listens on `PORT` or `3003`; `apps/agent-api/src/main.ts` uses global prefix `/api`.

Implication: the pilot should reuse the existing runtime Docker image instead of inventing a separate Railway runtime stack.

## Platform Evidence

Railway:

- Railway supports Dockerfile deploys and custom Dockerfile paths through service variables or config as code: https://docs.railway.com/builds/dockerfiles
- Railway config as code supports builder, Dockerfile path, healthcheck path, timeout, restart policy, and deployment teardown settings: https://docs.railway.com/config-as-code/reference
- Railway healthchecks wait for a `200` response before routing traffic to a new deployment; Railway injects `PORT` and uses it for healthchecks unless configured otherwise: https://docs.railway.com/deployments/healthchecks
- Railway Serverless/App Sleeping adds cold boot time and can return a 502 on the first request to a slept service: https://docs.railway.com/deployments/serverless
- Railway horizontal scaling creates replicas and randomly distributes traffic; sticky sessions are not supported: https://docs.railway.com/deployments/scaling
- Railway Redis can be provisioned as a project service and exposes `REDIS_URL`, `REDISHOST`, `REDISPORT`, `REDISUSER`, and `REDISPASSWORD`: https://docs.railway.com/databases/redis

Fly.io:

- Fly autostop/autostart can keep `min_machines_running`, but stopped Machines still pay cold start and Fly autostart never creates new Machines automatically: https://fly.io/docs/launch/autostop-autostart/
- Fly shared CPUs have enforced CPU quota and can be throttled; performance CPUs get the full scheduling quota: https://fly.io/docs/machines/cpu-performance/
- Fly stopped Machines release CPU/RAM and rebuild rootfs from the image on start; starting/stopping existing Machines is faster than creating/destroying Machines: https://fly.io/docs/launch/scale-count/

Architecture implication:

- Railway can be used as the always-warm shared chat runtime only if Serverless/App Sleeping is disabled.
- Railway multi-replica should not be used for this first pilot because OpenClaw local disk/config state is not coordinated across replicas and Railway does not provide sticky sessions.
- Fly is still the right fallback during the pilot because the existing per-user machine isolation already works.

## Pilot Architecture

```text
Browser
  |
  v
apps/web proxy
  |
  |-- read profile runtime target
  |
  |-- if agent_runtime_type is empty or fly_machine:
  |     current Fly per-user machine wake + pinned proxy
  |
  |-- if agent_runtime_type is shared_railway:
        profile.agent_runtime_url
          agent-api
          openclaw-gateway
          local workspace cache
          optional Redis service for future locks/metrics
        |
        |-- if Railway request fails before stream starts:
              current Fly per-user machine wake + pinned proxy fallback from profile.fly_machine_id
```

## Phase 0: Confirm Inputs Before Code

Do this before implementation starts.

- [ ] Confirm Sefy's Supabase auth email is exactly `sefy@olympus-digital.com`.
- [ ] Confirm Sefy's Supabase user UUID.
- [ ] Confirm Sefy's current `fly_machine_id` remains on the profile for fallback.
- [ ] Confirm whether Sefy's first test conversation is org-scoped or personal.
- [ ] Confirm Railway project/environment to deploy into.
- [ ] Confirm final Railway public service URL.
- [ ] Confirm Railway service resources are sized for `AGENT_API_BOOT_PROFILE=full`.

Recommendation: use `AGENT_API_BOOT_PROFILE=full` as the pilot target. In the Railway architecture, the Docker image is built once and the container should stay running 24/7 with Serverless/App Sleeping disabled, so full Nest module loading is paid on deploy/restart, not on each chat message. This differs from the current Fly cold-start problem, where stopped per-user Machines pay runtime boot cost when the user returns. `runtime-chat` is only a later resource/boot-time optimization if Railway memory or restart time becomes a problem, not a requirement for chat latency in the pilot.

## Phase 1: Add Profile Runtime Target Fields

Files:

- new Supabase migration under `supabase/migrations/`
- `apps/web/src/lib/runtime/machine-profile-env.ts`
- `packages/api-shared/src/services/machine-profile-env.ts`

Add production profile columns:

- `agent_runtime_type TEXT NOT NULL DEFAULT 'fly_machine'`
- `agent_runtime_url TEXT`

Add staging profile columns to match the existing machine-column pattern:

- `agent_runtime_type_staging TEXT NOT NULL DEFAULT 'fly_machine'`
- `agent_runtime_url_staging TEXT`

Add check constraints:

- runtime type must be `fly_machine` or `shared_railway`.
- when runtime type is `shared_railway`, runtime URL must be present.

Extend the profile-column helpers:

- add `runtimeType` and `runtimeUrl` to `MachineProfileColumns`,
- add `runtimeType` and `runtimeUrl` to `CanonicalMachineProfileRow`,
- make production resolve to `agent_runtime_type` / `agent_runtime_url`,
- make staging resolve to `agent_runtime_type_staging` / `agent_runtime_url_staging`.

Seed pilot by DB update only:

```sql
UPDATE profiles
SET
  agent_runtime_type = 'shared_railway',
  agent_runtime_url = 'https://<railway-service>'
WHERE id = '<sefy-user-id>';
```

Rollback by DB update only:

```sql
UPDATE profiles
SET
  agent_runtime_type = 'fly_machine',
  agent_runtime_url = NULL
WHERE id = '<sefy-user-id>';
```

Acceptance:

- Profiles default to the current Fly behavior.
- Sefy's row can move to Railway without code changes or env flags.
- Sefy's `fly_machine_id` remains unchanged for fallback.
- Staging and production do not read each other's runtime target columns.

Tests:

- Add/update helper tests for production and staging runtime target columns.
- Add a migration verification checklist for default values and check constraints.

## Phase 2: Use Profile Runtime Target in Web Proxy

File: `apps/web/src/app/api/proxy/[...path]/route.ts`

Implementation details:

- Add a `RuntimeTarget` shape:

```ts
type RuntimeTarget = {
  url: string
  machineId: string | null
  source: 'fly' | 'shared-railway' | 'fly-fallback'
}
```

- Extend `resolveProfileWithRetry` to select the active runtime target columns in addition to Fly Machine columns.
- Change `resolveAgentInfo` so the routing decision is:
  - if `agent_runtime_type` is missing, null, or `fly_machine`, use current Fly wake + pin behavior,
  - if `agent_runtime_type` is `shared_railway`, return `agent_runtime_url` without calling `wakeUserMachine`,
  - if Railway fails before stream starts and fallback is needed, call the existing Fly resolver using the same profile's `fly_machine_id`.
- Keep path behavior unchanged. The profile runtime target applies to the same agent paths already owned by this proxy.
- Ensure `copyAgentHeaders` deletes `fly-force-instance-id` for shared Railway targets.
- Do not add email-specific code.
- Do not add `SHARED_AGENT_RUNTIME_*` env flags.

Acceptance:

- Sefy chat/prewarm routes to Railway when his profile runtime target is `shared_railway`.
- Sefy falls back to Fly if Railway fails before the SSE stream starts.
- Users with default profile runtime target still wake and pin to their Fly Machine.
- No request to Railway includes `fly-force-instance-id`.
- Moving a user between Fly and Railway is a DB update, not a deploy.

Tests:

- Update `apps/web/src/app/api/proxy/[...path]/route.test.ts`.
- Add tests for:
  - profile runtime target `shared_railway` routes to `agent_runtime_url` and does not call machine wake,
  - missing/default `agent_runtime_type` still wakes Fly,
  - `agent_runtime_type=fly_machine` still wakes Fly,
  - shared target does not forward `fly-force-instance-id`,
  - shared failure falls back to Fly wake,
  - `/api/chat/prewarm` uses the same profile runtime target decision.

## Phase 3: Add Shared Runtime Mode in Agent API

Files:

- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`
- `apps/agent-api/src/health.controller.ts`
- `apps/agent-api/src/modules/agent-sync/interceptors/sync-ready.interceptor.ts`

Add environment flag:

- `AGENT_RUNTIME_MODE=shared`

Implementation details:

- Add `isSharedRuntime()` in `AgentSyncService`.
- In `bootstrapAsync`, when `AGENT_RUNTIME_MODE=shared`:
  - do not require `USER_ID`,
  - do not bind to Fly Machine identity,
  - set sync status to ready for request-scoped materialization,
  - leave request user identity to `AuthGuard` and chat/org guards.
- In `HealthController`, report runtime mode as `shared`.
- In `buildRuntimeCapabilities`, shared mode should be ready when:
  - Agent API booted,
  - OpenClaw gateway is reachable,
  - auth config is present,
  - sync service is available for request-scoped materialization.
- Keep non-shared mode behavior unchanged.

Acceptance:

- Railway `/api/health` returns 200 after boot without `USER_ID`.
- Railway `/api/ready` returns 200 in shared mode when gateway/auth are healthy.
- Existing Fly runtime still requires its current machine/user identity behavior.

Tests:

- Add or update Agent API health/sync tests for `AGENT_RUNTIME_MODE=shared`.
- Verify existing Fly behavior does not regress.

## Phase 4: Add Tenant-Scoped Personal OpenClaw Workspaces

Files:

- `apps/agent-api/src/modules/shared/agent-runtime.service.ts`
- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`
- `apps/agent-api/src/modules/shared/openclaw-gateway.service.ts`
- `apps/agent-api/src/modules/agent-sync/services/agent-runtime-readiness.service.ts`
- `docker/tools/vibey-backend/index.ts`

Required rule:

- Org agents stay `org-{orgId}-{agentKey}` and `AGENTS_BASE_DIR/orgs/{orgId}/{agentKey}`.
- Personal agents in shared mode become `user-{userId}-{agentKey}` and `AGENTS_BASE_DIR/users/{userId}/{agentKey}`.
- Personal agents outside shared mode keep the current Fly behavior unless explicitly migrated later.

Implementation details:

- Update `AgentRuntimeService.resolveConversationRuntime`:
  - org conversation: unchanged,
  - personal conversation in shared mode: return `gatewayAgentId=user-{userId}-{agentKey}`,
  - personal conversation outside shared mode: unchanged.
- Update `AgentSyncService.syncAgent`:
  - in shared mode, write personal workspace under `agentsBaseDir/users/{userId}/{agentKey}`,
  - call `gateway.ensureAgent` with the user-scoped gateway ID,
  - keep DB lookup behavior unchanged.
- Update `OpenClawGatewayService.expectedWorkspaceForAgent` and workspace token logic:
  - recognize `user-{uuid}-{agentKey}`,
  - map it to the user-scoped workspace path.
- Update `docker/tools/vibey-backend/index.ts`:
  - parse `user-{uuid}-{agentKey}` session/agent IDs,
  - load `ALLOWED_ACTIONS.json` from `AGENTS_BASE_DIR/users/{userId}/{agentKey}`.
- Ensure runtime readiness cache keys remain user-scoped. The existing cache already includes `personal:{userId}:{agentKey}`.

Acceptance:

- Two different users can use the same personal agent key without sharing OpenClaw workspace files.
- Org agents continue to use org-scoped workspaces.
- Artifact/tool policy loads from the correct user or org workspace.

Tests:

- Update `apps/agent-api/src/modules/shared/agent-runtime.service.test.ts`.
- Update `apps/agent-api/src/modules/agent-sync/services/agent-runtime-readiness.service.test.ts`.
- Update `apps/agent-api/src/modules/shared/openclaw-gateway.service.test.ts`.
- Add coverage for vibey backend allowed-action loading with a user-scoped workspace.

## Phase 5: Serialize OpenClaw Config Mutations

File: `apps/agent-api/src/modules/shared/openclaw-gateway.service.ts`

Why:

- `ensureAgent` and related config writes mutate `openclaw.json`.
- A shared runtime can materialize multiple agents in one long-lived process.
- Single Railway replica reduces risk, but concurrent first requests can still race in one process.

Implementation details:

- Add an in-process config mutation queue/mutex around operations that read-modify-write `openclaw.json`.
- Scope this to one process for the pilot.
- Do not use multi-replica Railway until config mutation is protected by an external lock or OpenClaw config state is moved out of local disk.

Acceptance:

- Concurrent first-time materialization of two agents does not lose either config entry.
- Existing batch behavior still works.

Tests:

- Add a concurrency test to `openclaw-gateway.service.test.ts` where two `ensureAgent` calls run together and both agents remain in config.

## Phase 6: Add Railway Deploy Config

File to add:

- `apps/agent-api/railway.json`

Planned config:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "docker/Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

Railway service settings:

- Replicas: `1`
- Serverless/App Sleeping: disabled
- Public networking: enabled for the pilot URL
- Region: closest practical region to current production users
- Volume: none for the pilot unless Railway deployment requires persistence

Redis:

- Provision Railway Redis in the same project.
- Expose `REDIS_URL` to the service.
- Do not depend on Redis for phase-one single-replica correctness unless we add a Redis client to Agent API.
- Use Redis in the next phase for distributed locks/timing if we scale beyond one replica.

Required service variables:

- `AGENT_RUNTIME_MODE=shared`
- `AGENT_API_BOOT_PROFILE=full`
- `OPENCLAW_CONFIG_PATH=/home/node/.openclaw/openclaw.json`
- `AGENTS_BASE_DIR=/app/agents`
- `OPENCLAW_GATEWAY_URL=http://localhost:18789`
- `OPENCLAW_GATEWAY_TOKEN=<secret>`
- `SUPABASE_URL=<prod-or-staging>`
- `SUPABASE_ANON_KEY=<secret>`
- `SUPABASE_SERVICE_ROLE_KEY=<secret>`
- `AGENT_INTERNAL_TOKEN=<secret>`
- provider keys currently required by OpenClaw/OpenRouter
- `REDIS_URL=<railway-redis-url>` if Redis is provisioned

Acceptance:

- Railway deploy starts Agent API and OpenClaw gateway in the same container.
- `/api/health` returns 200.
- `/api/health/deep` verifies gateway/auth readiness before changing Sefy's profile runtime target.

## Phase 7: Add Timing and Fallback Observability

Files:

- `apps/web/src/app/api/proxy/[...path]/route.ts`
- `apps/agent-api/src/modules/chat/controllers/chat.controller.ts`
- existing chat service timing logs, if sufficient

Web proxy timing logs:

- `runtime_target_selected`
- `shared_fetch_start`
- `shared_response_headers`
- `shared_first_upstream_chunk`
- `shared_stream_complete`
- `shared_fetch_failed`
- `fly_fallback_start`
- `fly_fallback_headers`
- `fly_fallback_first_upstream_chunk`

Include these fields:

- user ID
- email or email hash
- org ID
- path
- runtime target: `shared-railway`, `fly`, `fly-fallback`
- conversation ID if present
- duration in ms
- error class if fallback happens

Response/debug signal:

- For non-stream responses, add `x-vibey-agent-runtime: shared-railway|fly|fly-fallback`.
- For SSE, keep the current warmup status events and add logs rather than changing stream contract.

Acceptance:

- One Sefy chat can be traced from web proxy to Railway Agent API to OpenClaw.
- We can answer:
  - time from browser request to backend target selection,
  - time to Railway response headers,
  - time to first streamed chunk,
  - total stream time,
  - whether fallback occurred,
  - whether agent workspace was already materialized.

## Phase 8: Manual Pilot Runbook

Preparation:

- [ ] Deploy Railway service with one replica and Serverless disabled.
- [ ] Verify `/api/health`.
- [ ] Verify `/api/health/deep`.
- [ ] Update Sefy's profile row to `agent_runtime_type=shared_railway` and `agent_runtime_url=<railway-service>`.
- [ ] Ensure Sefy's Fly Machine exists and is stopped, not destroyed.

Test 1: shared runtime happy path

- [ ] Login as `sefy@olympus-digital.com`.
- [ ] Open a normal chat conversation.
- [ ] Send one message.
- [ ] Verify web proxy selected `shared-railway`.
- [ ] Verify no Fly wake call happened.
- [ ] Verify first response starts under 10 seconds after the Railway service is already warm.
- [ ] Verify artifacts/tool calls still work from chat.

Test 2: workspace materialization

- [ ] Delete the local Railway workspace cache or deploy fresh.
- [ ] Send first message to a system agent.
- [ ] Measure sync/materialization time.
- [ ] Send second message to same agent.
- [ ] Confirm second message avoids materialization cost.

Test 3: personal workspace safety

- [ ] Start a personal agent chat for Sefy.
- [ ] Confirm OpenClaw workspace is under `AGENTS_BASE_DIR/users/{sefyUserId}/{agentKey}`.
- [ ] Confirm gateway agent ID is `user-{sefyUserId}-{agentKey}`.
- [ ] Confirm `ALLOWED_ACTIONS.json` loads from that same workspace.

Test 4: fallback

- [ ] Temporarily set Sefy's `agent_runtime_url` to an invalid URL, or stop the Railway service.
- [ ] Send Sefy chat message.
- [ ] Verify proxy logs `shared_fetch_failed`.
- [ ] Verify proxy wakes Sefy's Fly Machine.
- [ ] Verify request succeeds through Fly.
- [ ] Restore Sefy's Railway URL.

Test 5: non-pilot isolation

- [ ] Login as a non-pilot user.
- [ ] Send chat.
- [ ] Verify current Fly wake path is used.
- [ ] Verify no request goes to Railway.

## Automated Test Commands

Do not run builds automatically unless explicitly requested.

Suggested targeted tests after implementation:

```bash
pnpm --filter @vibey/web test apps/web/src/app/api/proxy/[...path]/route.test.ts
pnpm --filter @vibey/agent-api test apps/agent-api/src/modules/shared/agent-runtime.service.test.ts
pnpm --filter @vibey/agent-api test apps/agent-api/src/modules/agent-sync/services/agent-runtime-readiness.service.test.ts
pnpm --filter @vibey/agent-api test apps/agent-api/src/modules/shared/openclaw-gateway.service.test.ts
pnpm --filter @vibey/agent-api test
```

Manual deploy verification:

```bash
curl -i https://<railway-service>/api/health
curl -i https://<railway-service>/api/health/deep
```

## Success Metrics

Pilot is successful only if all are true:

- Sefy warm chat first visible answer starts in under 10 seconds for already-materialized agents.
- First message after fresh Railway deploy has measured materialization cost and then subsequent messages are materially faster.
- No user routes to Railway unless their profile runtime target is `shared_railway`.
- No `fly-force-instance-id` is sent to Railway.
- Shared Railway failure falls back to Sefy's Fly Machine without manual intervention.
- Personal agent workspace path is user-scoped.
- Org agent workspace path remains org-scoped.
- Artifact tool calls work inside chat.
- Railway service stays warm; no Serverless cold boot during the pilot.

## Workspace Cache Growth Gate

The pilot can use disposable local workspace files because only one user is routed to Railway. Before expanding beyond a small number of orgs/users, add explicit cache management for materialized org/user OpenClaw workspaces.

Required before broader rollout:

- Track `last_used_at` for each materialized org/user workspace.
- Track a version/hash for each materialized workspace so stale files can be invalidated from DB changes.
- Delete inactive org/user workspace folders after a defined TTL.
- Add a max disk usage guard so the Railway container cannot grow unbounded over time.
- Keep system agents baked into the Docker image.
- Keep Supabase as the source of truth for org/user/custom agents and skills.

This keeps file materialization as a transition layer for OpenClaw compatibility, not permanent storage. DB-native or virtual-workspace OpenClaw can remain a later architecture phase after the Railway pilot proves the shared runtime path.

## Rollback

Fast rollback:

- Set Sefy's profile runtime target back to `fly_machine`.
- Sefy immediately returns to the existing Fly path.
- Keep Railway service running only for debugging, or stop it after logs are collected.

Hard rollback:

- Clear Sefy's `agent_runtime_url`.
- Keep all Fly Machines and existing machine metadata unchanged.

No destructive database rollback should be needed. The new profile runtime columns can remain with default `fly_machine`.

## What Not To Do In This Pilot

- Do not move all users.
- Do not hardcode Sefy's email into routing logic.
- Do not add pilot-specific runtime env flags for web proxy routing.
- Do not enable Railway horizontal replicas.
- Do not depend on Railway local disk as durable state.
- Do not delete or destroy Fly Machines.
- Do not move brainwork to BullMQ yet.
- Do not split browser/ffmpeg into a worker yet.
- Do not use Railway Serverless/App Sleeping for the shared chat runtime.
- Do not route personal chats to shared runtime before user-scoped OpenClaw workspaces are implemented.

## Main Risks

1. Personal agent collisions.
   - Mitigation: user-scoped gateway IDs and workspace paths before personal-chat routing.

2. OpenClaw config write races.
   - Mitigation: in-process mutation queue for one replica; external lock before replicas.

3. Railway single replica restart clears local cache.
   - Mitigation: treat disk as cache, re-materialize from Supabase on demand, measure first-message cost.

4. Artifact policy path mismatch.
   - Mitigation: update vibey backend plugin to understand `user-{uuid}-{agentKey}`.

5. Fallback after SSE starts is not safe.
   - Mitigation: fallback only before stream headers/chunks are sent. Once the stream starts, surface the runtime error normally.

6. Redis not currently a dependency of Agent API.
   - Mitigation: provision Redis for the architecture, but do not require it for single-replica phase-one correctness unless a Redis client is added intentionally.

## Missing Evidence Before Implementation

- Sefy's exact Supabase user UUID.
- Sefy's current production `fly_machine_id` and `fly_machine_url`.
- The Railway project/environment/service URL.
- Whether first pilot chats are personal, org-scoped, or both.
- Whether `runtime-chat` could be useful later as a resource/restart-time optimization. It is not required for the first Railway pilot because the service should run warm with `full`.
- Exact Redis client choice if we add Redis locks inside Agent API. The existing queue worker uses BullMQ/Redis, but Agent API does not currently declare Redis as a direct dependency.
- Live Railway deploy behavior for the existing `docker/Dockerfile` with `supervisord`. Smallest experiment: deploy one service, verify `/api/health`, `/api/health/deep`, and one authenticated chat.

## Move-All-Users Gate

Only consider expanding beyond Sefy after:

- at least 2-3 days of successful Sefy chat traffic,
- no cross-user workspace/path leakage found,
- fallback tested at least once,
- timing logs show stable warm-chat latency,
- materialization cost is understood,
- OpenClaw config mutation is safe under concurrent requests,
- Redis/external locking plan is implemented if more than one Railway replica is needed.

Recommended expansion order:

1. Sefy only.
2. One internal/org user in the same org.
3. One full operational org.
4. All current operational orgs.
5. Only then decide whether Fly per-user Machines become backup-only or are retired.
