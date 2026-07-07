# Runtime Infrastructure Architecture Analysis - 2026-06-08

## Architect Summary

Status: analysis only. No runtime code or infrastructure settings were changed.

Main conclusion: the current per-user Fly Machine model is the root reason chat can feel slow after idle. The system does not only wait on reading agent files. It waits on a serialized path: machine start, Agent API boot, OpenClaw gateway boot, capability checks, identity binding for pooled machines, `/api/ready`, then chat's own runtime readiness and context build.

The right target is not "one giant shared machine for everything." The safer target is a warm shared chat runtime pool, with work/project/browser/heavy tool execution still isolated until the chat runtime can prove tenant isolation, request-scoped identity, and external session/state handling.

The strongest architecture direction:

1. Keep per-user or per-job isolated runtimes for heavy work paths in the near term.
2. Move chat to a warm, shared, horizontally scalable runtime tier.
3. Make agent identity, skills, and context request-scoped and DB/cache-backed for chat.
4. Split heavyweight tools such as FFmpeg, browser, and project runtime into dedicated workers/services invoked only when needed.

This directly targets sub-10-second first response for chat while avoiding the highest-risk part of a full shared runtime migration: cross-tenant leakage through OpenClaw config, local workspaces, sessions, browser state, and tool side effects.

## Current System Verified From Code

### Per-user Fly Machine lifecycle

The API provisions a Fly Machine per user with `USER_ID`, `PORT=3003`, and an `AGENT_API_BOOT_PROFILE`. The current machine guest is `shared-cpu-2x`, `4096` MB RAM, region `iad`, `autostop=false`, `autostart=false`, and `min_machines_running=0`.

Evidence:

- `apps/api/src/modules/machines/services/machines.service.ts:305-364`
- `docker/fly.runtime.toml:1-33`

The public ensure-running path accepts `required_runtime`, normalizes only `chat` or `work`, and passes that into `MachinesService.ensureRunning`.

Evidence:

- `apps/api/src/modules/machines/controllers/machines.controller.ts:30-32`
- `apps/api/src/modules/machines/controllers/machines.controller.ts:110-128`
- `apps/api/src/modules/machines/controllers/machines.controller.ts:194-196`

The internal machine wake route used by mission-worker does not accept `required_runtime`; it only accepts `user_id` and calls `ensureRunning` with default options. Since `MachinesService.ensureRunning` defaults to `work`, internal mission wake is work-runtime wake today.

Evidence:

- `apps/api/src/modules/machines/dto/internal-ensure-machine.dto.ts:3-5`
- `apps/api/src/modules/machines/controllers/internal-machines.controller.ts:24-39`
- `apps/api/src/modules/machines/services/machines.service.ts:494`

### Idle stop behavior

Idle Manager uses a default 15 minute threshold and stops machines through `MachinesService.suspendIdleMachine`. The service records status as `suspended`, but the implementation calls Fly stop/wait rather than Fly suspend.

Evidence:

- `apps/api/src/modules/machines/services/idle-manager.service.ts:10-14`
- `apps/api/src/modules/machines/services/idle-manager.service.ts:30-60`
- `apps/api/src/modules/machines/services/machines.service.ts:983-1029`

### Wake path

`MachinesService.ensureRunning` treats Fly as the source of truth, not profile status. It:

- Loads machine/app IDs from `profiles`.
- Reads current Fly machine state.
- Replaces destroyed machines.
- Starts machines that are not `started`.
- Waits for Fly state `started` up to `180000` ms.
- Waits for `/api/health` up to `300000` ms.
- Probes runtime capabilities.
- Binds runtime identity for pool machines.
- Waits for `/api/ready` up to `120000` ms.

Evidence:

- `apps/api/src/modules/machines/services/machines.service.ts:467-481`
- `apps/api/src/modules/machines/services/machines.service.ts:541-557`
- `apps/api/src/modules/machines/services/machines.service.ts:571-639`
- `apps/api/src/modules/machines/services/machines.service.ts:642-730`
- `apps/api/src/modules/machines/services/machines.service.ts:934-964`
- `apps/api/src/modules/machines/services/machines.service.ts:1259-1288`

### Chat vs work runtime profiles

`chat` maps to boot profile `runtime-chat`; `work` maps to `full`.

Evidence:

- `apps/api/src/modules/machines/services/machines.service.ts:24`
- `apps/api/src/modules/machines/services/machines.service.ts:108-110`

Agent API chooses the Nest module at startup based on `AGENT_API_BOOT_PROFILE`. `runtime-chat` imports a smaller module graph; `full` imports Chat plus Brain, Artifacts, ChannelAgent, TaskAgent, ProjectRuntime, Sessions, AdminSkillBuilder, and more.

Evidence:

- `apps/agent-api/src/main.ts:20-32`
- `apps/agent-api/src/runtime-chat-app.module.ts:1-32`
- `apps/agent-api/src/app.module.ts:1-54`

Runtime capability requirements are different. Chat requires `ready_probe` and `identity_bind`; work additionally requires `openclaw_responses`.

Evidence:

- `apps/api/src/modules/machines/services/machine-runtime-capabilities.service.ts:26-29`
- `apps/api/src/modules/machines/services/machine-runtime-capabilities.service.ts:112-137`

### Web proxy wake behavior

The Next proxy routes chat and agent paths to the user's Fly runtime. Chat is treated specially: it streams warmup status while `resolveAgentInfo` calls the backend ensure-running route with `required_runtime='chat'`, then forwards to `/api/chat` using `fly-force-instance-id`.

Evidence:

- `apps/web/src/app/api/proxy/[...path]/route.ts:1-46`
- `apps/web/src/app/api/proxy/[...path]/route.ts:175-202`
- `apps/web/src/app/api/proxy/[...path]/route.ts:208-225`
- `apps/web/src/app/api/proxy/[...path]/route.ts:331-340`
- `apps/web/src/app/api/proxy/[...path]/route.ts:342-498`
- `apps/web/src/app/api/proxy/[...path]/route.ts:552-573`

The proxy deliberately avoids falling back to unpinned app-level routing when a machine ID exists, to prevent cross-tenant delivery.

Evidence:

- `apps/web/src/app/api/proxy/[...path]/route.ts:208-225`

### Agent files and skills are already DB-backed, then materialized to disk

Agent definitions, skills, resources, workflows, and scoped vibey-api skill surfaces are read from Supabase and written to the runtime workspace. System agents keep canonical identity files, but skills/resources are scoped by user or org.

Evidence:

- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts:966-1155`
- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts:1158-1328`
- `apps/agent-api/src/modules/agent-sync/services/agent-runtime-skill-scope.service.ts:58-120`
- `apps/agent-api/src/modules/agent-sync/services/agent-runtime-skill-scope.service.ts:122-193`
- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts:1849-1951`

Chat can lazily repair runtime files. `AgentRuntimeReadinessService.ensureRuntimeReady` inspects OpenClaw config and workspace files, then calls `syncAgent` or `syncOrgAgent` if missing.

Evidence:

- `apps/agent-api/src/modules/agent-sync/services/agent-runtime-readiness.service.ts:47-76`
- `apps/agent-api/src/modules/agent-sync/services/agent-runtime-readiness.service.ts:78-107`

OpenClaw runtime inspection specifically requires an agent config entry, workspace path, `SOUL.md`, `ROLE.md`, `IDENTITY.md`, `skills/vibey-api/SKILL.md`, and any requested skill/resource files.

Evidence:

- `apps/agent-api/src/modules/shared/openclaw-gateway.service.ts:314-378`

### Chat still does significant work after runtime wake

After prewarm/context cache lookup, chat can resolve runtime readiness, policy, documents, slash-command skills, brain context, profiles, team roster, integrations, image context, action policy, message creation, tracing, and finally stream through OpenClaw.

Evidence:

- `apps/agent-api/src/modules/chat/services/chat.service.ts:856-902`
- `apps/agent-api/src/modules/chat/services/chat.service.ts:1380-1505`
- `apps/agent-api/src/modules/chat/services/chat.service.ts:1678-1708`
- `apps/agent-api/src/modules/chat/services/chat.service.ts:1724-1838`
- `apps/agent-api/src/modules/chat/services/chat.service.ts:1913-2005`
- `apps/agent-api/src/modules/chat/services/chat.service.ts:2075-2123`
- `apps/agent-api/src/modules/chat/services/chat.service.ts:2566-2630`

Frontend prewarm exists and runs on focus/input with debounce.

Evidence:

- `apps/web/src/features/studio/services/chat.service.ts:394-420`
- `apps/web/src/features/studio/services/chat.service.ts:422-450`
- `apps/agent-api/src/modules/chat/controllers/chat.controller.ts:48-114`

### Runtime container layout

The runtime image contains Agent API, OpenClaw, ffmpeg, yt-dlp, Chromium, Xvfb, Squid, prewarmed Node compile cache, preseeded Vibey/HR agent files, and a manual browser sidecar.

Evidence:

- `docker/Dockerfile:1-7`
- `docker/Dockerfile:103-115`
- `docker/Dockerfile:151-168`
- `docker/Dockerfile:182-213`
- `docker/supervisord.conf:8-37`
- `docker/supervisord.conf:38-49`
- `docker/vibey-browser-sidecar.sh:1-29`

## Platform Facts Verified From Official Docs

### Fly.io

Shared CPU is not equivalent to dedicated CPU. Fly says shared and performance vCPUs run on the same physical hardware, but shared vCPUs have a baseline quota of 5 ms per 80 ms period while performance vCPUs get the full 80 ms. A shared-cpu-2x machine gets 10 ms per 80 ms period total, with burst balance behavior.

Source: https://fly.io/docs/machines/cpu-performance/

Fly exposes metrics for CPU utilization, quota balance, throttling, and steal. The docs specifically call out steal as either quota throttling or host competition.

Source: https://fly.io/docs/machines/cpu-performance/

Fly autostop/autostart can keep one or more machines running using `min_machines_running`, but Fly Proxy autostop/autostart starts and stops existing Machines; it does not create new machines. For thousands of per-user Machines in a single app, Fly says the stop loop cannot keep up and recommends one app per user with dynamic routing or app-managed idle shutdown.

Sources:

- https://fly.io/docs/launch/autostop-autostart/
- https://fly.io/docs/reference/autoscaling/

Fly Machines API can create, start, stop, suspend, update, delete, lease, cordon, uncordon, and wait on machines.

Source: https://fly.io/docs/machines/api/machines-resource/

Fly suspend can resume from memory snapshot in hundreds of milliseconds, but the machine should have 2 GB memory or less; larger memory is discouraged due to suspend time. Suspended machines cost storage only, not CPU/RAM.

Source: https://fly.io/docs/reference/suspend-resume/

Fly dynamic routing supports routing to a specific Machine, another app, or another region through `fly-replay`, and supports `fly-force-instance-id` for forcing a specific Machine with no fallback.

Source: https://fly.io/docs/networking/dynamic-request-routing/

Fly scaling guidance says starting/stopping existing Machines is faster than creating/destroying them. For bursty workloads, Fly recommends creating enough Machines for peak load and adjusting active capacity by stopping/starting.

Source: https://fly.io/docs/launch/scale-count/

Fly pricing is region-dependent. The public pricing table lists shared-cpu-2x 4 GB and performance-2x 4 GB as meaningfully different monthly costs. The repo also has a local default `FLY_MACHINE_HOURLY_RATE` of `0.0226`, used in unit economics, but that value should be treated as an app assumption, not the live source of truth.

Sources:

- https://fly.io/docs/about/pricing/
- `apps/api/src/modules/admin/services/unit-economics.service.ts:173-178`

### Railway

Railway services are containers. Services can be persistent/always-running or scheduled jobs. Railway can deploy from GitHub, local directory, or Docker image, and will use a Dockerfile if found.

Source: https://docs.railway.com/services

Railway supports long-running workers and queues. Their own guide recommends a separate always-on worker service for continuous processing, Redis or RabbitMQ for queues, and private networking for service-to-service communication.

Source: https://docs.railway.com/guides/cron-workers-queues

Railway private networking creates encrypted WireGuard tunnels and gives services internal `railway.internal` DNS names.

Source: https://docs.railway.com/private-networking

Railway vertical autoscaling scales services up to the vCPU and memory limits of the plan. Horizontal replicas are manual. Public traffic is randomly distributed among replicas in a single region, and Railway currently does not support sticky sessions.

Source: https://docs.railway.com/deployments/scaling

Railway persistent services get ephemeral storage: 1 GB on Free and 100 GB on paid plans. Services needing persistence should use volumes.

Source: https://docs.railway.com/services

Railway volumes exist, but each service can only have one volume and replicas cannot be used with volumes. That is a key constraint for OpenClaw if sessions/workspaces remain local filesystem state and the service needs horizontal replicas.

Source: https://docs.railway.com/volumes/reference

Railway Serverless sleep wakes on inbound traffic, but introduces first-request cold boot time. It also requires no outbound traffic for 10 minutes and can require a rebuild in remote cases. This should be disabled for a low-latency always-warm chat runtime.

Source: https://docs.railway.com/deployments/serverless

Railway build config can install apt packages in the final image through Railpack, and Dockerfile-based deployment is supported. FFmpeg as a container dependency is therefore possible.

Sources:

- https://docs.railway.com/builds/build-configuration
- https://docs.railway.com/services

Railway resource pricing is usage-based: CPU, RAM, egress, and volume storage are billed by resource usage, with minute-level compute billing.

Source: https://docs.railway.com/pricing

## Option Analysis

### Option A: Keep per-user Fly Machines and optimize wake

What this means:

- Continue current per-user machine model.
- Improve warmup, pooling, and stop/suspend behavior.
- Keep user isolation and current routing assumptions.

What is already available:

- `runtime-chat` boot profile.
- Chat prewarm endpoint and frontend prewarm scheduler.
- Machine pool service, gated by `MACHINE_POOL_REPLENISH_ENABLED`.
- Runtime identity binding for pool machines, gated by `MACHINE_POOL_RUNTIME_BIND_ENABLED`.
- Capability promotion from chat to full work profile.

Evidence:

- `apps/api/src/modules/machines/services/machine-pool.service.ts:33-34`
- `apps/api/src/modules/machines/services/machine-pool.service.ts:154-263`
- `apps/api/src/modules/machines/services/machines.service.ts:105-110`
- `apps/api/src/modules/machines/services/machines.service.ts:776-864`

What this can improve:

- Cold start frequency.
- Onboarding machine allocation delay if pool is enabled.
- First chat path if prewarm runs before message submit.
- Work path reliability if internal wake accepts required runtime in the future.

What it cannot fully solve:

- If the user's runtime is stopped, chat still pays Fly start plus Agent API/OpenClaw boot.
- Fly suspend could help, but current 4 GB machines exceed Fly's recommended suspend memory threshold. A separate <=2 GB chat runtime would fit suspend better.
- Per-user performance CPUs are still too expensive at scale.

Verdict:

- Good near-term mitigation.
- Not enough for consistent sub-10-second chat after 15 minutes idle unless chat runtime is kept warm, pooled, or moved to suspend-compatible size.

### Option B: One warm performance machine, then scale/move users

What this means:

- Run one or more warm performance machines.
- Route users to a currently assigned runtime.
- Add machines based on CPU/load.
- Move users between machines.
- Keep core system agents on disk.
- Load custom user agents/skills from DB on demand.

Platform feasibility:

- Fly can run performance Machines.
- Fly exposes metrics and supports metrics-based autoscaling.
- Fly can dynamically route to specific Machines or apps.
- Fly can create/start/stop/update machines through Machines API.

Sources:

- https://fly.io/docs/machines/cpu-performance/
- https://fly.io/docs/reference/autoscaling/
- https://fly.io/docs/networking/dynamic-request-routing/
- https://fly.io/docs/machines/api/machines-resource/

Codebase feasibility:

This is not a small infrastructure switch. Current runtime identity is machine-scoped, not request-scoped:

- Machines get `USER_ID` in environment at provisioning.
- Pool machines are bound to one user identity before ready.
- Agent sync writes files into local workspaces under one runtime.
- Agent readiness caches are keyed by user/org/agent, but the underlying OpenClaw config and workspace are local.
- Web proxy deliberately pins traffic to one Fly machine ID to avoid cross-tenant routing.

Evidence:

- `apps/api/src/modules/machines/services/machines.service.ts:305-364`
- `apps/api/src/modules/machines/services/machines.service.ts:118-165`
- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts:427-453`
- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts:476-502`
- `apps/agent-api/src/modules/agent-sync/services/agent-runtime-readiness.service.ts:109-118`
- `apps/web/src/app/api/proxy/[...path]/route.ts:208-225`

Required architectural changes:

- Replace machine-level `USER_ID` with request-scoped tenant identity.
- Namespace every OpenClaw agent ID, workspace, session, browser state, and tool call by user/org.
- Externalize or replicate session state so a user can move between machines.
- Add a capacity-aware scheduler and assignment table.
- Add backpressure and queueing when a shared runtime is saturated.
- Decide whether a conversation must stick to one runtime, or make OpenClaw sessions portable.
- Add hard safeguards preventing one tenant from reading another tenant's files, sessions, artifacts, browser screenshots, and tool credentials.

Benefits:

- Solves the worst UX problem for chat because there is always a warm runtime.
- Lets you buy performance CPU for a small shared pool instead of every user.
- Aligns with DB-backed custom agents and skills.

Risks:

- Highest tenant isolation risk.
- One bad tenant/tool path can affect other tenants on the same runtime.
- Moving users is unsafe until sessions and local workspace state are portable.
- Shared OpenClaw config mutations must be concurrency-safe.

Verdict:

- Correct direction only if scoped first to chat.
- Too risky as a direct replacement for all per-user machines.

### Option C: No Fly per-user machines; shared Agent API and OpenClaw on Railway

What this means:

- Run Agent API and OpenClaw as one or more normal long-running services.
- Use workers/queues for FFmpeg, media, browser, or project runtime.
- Stop provisioning one Fly Machine per user.

Platform feasibility:

- Railway supports persistent services, Dockerfile deployment, workers, queues, private networking, Redis/RabbitMQ, and apt package installs.
- Railway can run FFmpeg in a container or final image.
- Railway can run multiple services in one project and connect them privately.

Sources:

- https://docs.railway.com/services
- https://docs.railway.com/guides/cron-workers-queues
- https://docs.railway.com/private-networking
- https://docs.railway.com/builds/build-configuration

Important constraints:

- Railway horizontal replicas do not have sticky sessions.
- Railway services with volumes cannot use replicas.
- Railway Serverless sleep creates first-request cold boot and should not be used for latency-critical chat.

Sources:

- https://docs.railway.com/deployments/scaling
- https://docs.railway.com/volumes/reference
- https://docs.railway.com/deployments/serverless

Codebase feasibility:

The same codebase blockers as Option B apply, plus Railway-specific state constraints:

- If OpenClaw sessions/workspaces stay local, replicas are unsafe because requests are randomly distributed and there are no sticky sessions.
- If a Railway volume is used for OpenClaw workspace/session persistence, replicas are not supported with that volume.
- Therefore, a horizontally scalable Railway chat runtime requires externalized session/workspace state or stateless per-request prompt construction.

Benefits:

- Simpler operational model than per-user Fly Machines.
- Works well for stateless shared chat if state is moved to DB/cache/object storage.
- Workers/queues fit the FFmpeg and background job idea.

Risks:

- Full migration would remove the isolation boundary before replacing it with request-level isolation.
- OpenClaw local state is the hard part, not the host provider.
- Railway no-sticky-session behavior makes naive multi-replica OpenClaw unsafe.

Verdict:

- Viable as a future shared-chat or stateless-agent platform.
- Not safe as a direct lift-and-shift of current per-user runtime semantics.

### Option D: Hybrid warm shared chat runtime plus isolated work runtimes

What this means:

- Chat requests go to a warm shared chat runtime tier.
- Work/mission/project/browser/media-heavy paths keep isolated per-user/per-job runtime initially.
- Core system agents remain preseeded on image/disk.
- Custom agents and skills are loaded from DB/cache on demand.
- Heavy tools become separate services or job workers.

Why this is the strongest path:

- It directly targets the UX problem: chat first response after idle.
- It limits tenant-isolation blast radius because chat can be constrained to text/context/tool-safe operations first.
- It avoids rewriting all mission/artifact/project/browser flows before proving the runtime model.
- It lets you measure whether DB-backed on-demand skills are materially slower than local disk after removing machine cold start.

Required changes:

- Introduce a `chat_runtime_assignments` or equivalent scheduler table.
- Add a shared chat runtime service that does not depend on machine-level `USER_ID`.
- Make `AgentRuntimeService` request-scoped and align agent key mapping across agent-api and mission-worker.
- Change chat runtime readiness to use DB/cache-backed agent/skill materialization without rewriting global OpenClaw config unsafely.
- Add per-tenant namespacing to OpenClaw agent IDs and session keys.
- Add per-runtime concurrency limits, queueing, and eviction.
- Keep fallback to current per-user runtime if shared chat runtime cannot serve a request safely.

Verdict:

- Recommended target architecture.
- Build in phases with measurable gates.

## Direct Answers To Your Specific Ideas

### "Core system agents on disk, custom agents from DB"

This is aligned with the codebase. The runtime image already pre-seeds some system agents, and the database is already the source of truth for runtime definitions, skills, resources, and workflows. The current issue is that DB content is materialized to local disk and OpenClaw config per runtime. For a shared chat runtime, the hard part is safe namespacing and concurrency, not whether DB lookup is possible.

### "Only load the requested skill"

Partially already present. Slash-command chat resolves requested skills and passes required skill files into `runtimeReadiness.ensureRuntimeReady`. But sync still writes skill directories and `SKILLS.md` into local workspaces. A future shared chat runtime should shift toward request-scoped skill context injection or a cache keyed by `(tenant, agent, skill version)`.

Evidence:

- `apps/agent-api/src/modules/chat/services/chat.service.ts:1678-1708`
- `apps/agent-api/src/modules/agent-sync/services/agent-runtime-readiness.service.ts:54-57`
- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts:1849-1951`

### "Scale machines based on usage"

Possible on Fly. Fly supports metrics-based autoscaling and Machines API management. But Fly's built-in autostart/autostop does not create machines; it starts/stops existing machines. You need either pre-created capacity or the metrics autoscaler/create/delete flow.

### "Move people between machines"

Not safe with current architecture until session/workspace state becomes portable or request-scoped. Current code assumes a user is pinned to a machine ID for safety, and OpenClaw/local workspace state is on that runtime.

### "No machines at all, Agent API/OpenClaw on Railway"

Possible only after changing the runtime to be shared-safe. Railway can run the services and workers, but it does not solve OpenClaw local session/workspace state by itself. Also disable Railway Serverless for chat, because sleeping services reintroduce cold boot.

### "FFmpeg microservice with BullMQ/Redis"

Feasible. The current runtime image already installs `ffmpeg`; Railway supports workers, Redis queues, private networking, and apt package installs. This is a good candidate to extract because it does not need to be in every chat runtime.

Evidence:

- `docker/Dockerfile:103-115`
- Railway workers/queues docs: https://docs.railway.com/guides/cron-workers-queues
- Railway build package docs: https://docs.railway.com/builds/build-configuration

## Recommended Migration Plan

### Phase 0: Measure before moving

Goal: know exactly where the 90 seconds goes.

Add or consolidate timing for:

- Proxy wake start.
- Fly `startMachine`.
- Fly wait `started`.
- `/api/health`.
- capability probe.
- identity bind.
- `/api/ready`.
- chat `runtime_ready`.
- chat `stable_context_ready`.
- `brain_context_done`.
- first OpenClaw token.

The code already logs many chat stages; the missing decision metric is an aggregated per-request wake waterfall from browser submit to first token.

### Phase 1: Current architecture mitigation

Do these before a full architecture rewrite:

1. Extend internal ensure-running to accept `required_runtime` so background callers do not accidentally promote or wake full work runtime when chat is intended.
2. Turn on and tune machine pool only if pool identity binding is production-ready.
3. Use chat prewarm aggressively on focus and first typed character.
4. Evaluate a separate <=2 GB chat Machine profile so Fly suspend becomes viable for chat.
5. Use Fly suspend for chat runtimes only if DB/OpenClaw connections recover correctly after resume.

Why this phase matters: it reduces user pain while building the shared runtime safely.

### Phase 2: Build a shared chat runtime tier

Start with a small pool of warm performance runtimes. This can be on Fly or Railway; provider choice is secondary to shared-runtime correctness.

Hard requirements:

- Request-scoped tenant identity.
- Namespaced OpenClaw agent IDs and session keys.
- No shared local mutable state without tenant namespace.
- External session/state store or deterministic per-request context reconstruction.
- Per-tenant rate limits and per-runtime concurrency limits.
- Fallback to existing per-user runtime.

### Phase 3: Split heavy tools into workers

Extract:

- FFmpeg/media processing.
- Browser sidecar.
- Project runtime/app preview.
- Long-running mission work if it does not need interactive chat latency.

Use queue-backed services with explicit status updates and retries.

### Phase 4: Retire per-user machines selectively

Only retire per-user Machines for flows that pass isolation and latency gates. Keep isolated runtimes for any flow that still uses local files, browser state, project execution, or broad tool access.

## Decision Matrix

| Option | Latency | Cost | Engineering risk | Tenant isolation risk | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Keep current per-user stopped Machines | Poor after idle | Good when idle | Low | Low | Not enough |
| Optimize current model with pool/prewarm/suspend | Medium | Medium | Low-medium | Low | Do now |
| One shared performance machine for all runtime paths | Good initially | Good at low scale | High | High | Do not start here |
| Railway shared Agent API/OpenClaw lift-and-shift | Good if always warm | Medium | High | High | Not safe as lift-and-shift |
| Hybrid shared chat plus isolated work | Good for chat | Medium-good | Medium-high | Medium if scoped | Recommended |

## Main Risks To Resolve Before Shared Chat

1. OpenClaw config mutation safety under concurrent tenant requests.
2. Local workspace cleanup and stale files across tenants.
3. Session portability or deterministic session reconstruction.
4. Browser/media/tool side effects leaking across tenants.
5. Per-agent mapping inconsistency between agent-api and mission-worker.
6. No-sticky-session behavior if using Railway replicas.
7. Volume/replica incompatibility if using Railway local filesystem persistence.
8. Connection recovery if using Fly suspend.

## Notable Architecture Mismatch Found

Project architecture docs require unified agent runtime mapping. Current agent-api and mission-worker mappings differ for org agents:

- Agent API uses `org-${orgId}-${agentKey}`.
- Mission worker uses `org:${orgId}:${agentKey}`.

Evidence:

- `.docs/guidelines/architecture/project-architecture.md`, Agent Runtime Consistency section
- `apps/agent-api/src/modules/shared/agent-runtime.service.ts:14-18`
- `apps/mission-worker/src/modules/missions/services/agent-runtime.service.ts:13-17`
- `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts:1223-1226`

This should be fixed before a shared runtime migration, because shared routing depends on a canonical agent ID.

## Final Recommendation

Build the shared chat runtime first, not a shared everything runtime.

Use warm performance capacity for chat. Keep custom agents and skills DB-backed, with cache/materialization keyed by tenant and version. Keep heavy work on isolated runtimes or dedicated worker services. Once chat is proven safe and fast, migrate other paths one class at a time.

The provider decision should come after the runtime-state decision:

- If OpenClaw/session state remains local and sticky, Fly is easier because Fly can route to specific Machines.
- If OpenClaw/session state becomes external/stateless, Railway becomes more attractive because normal long-running services, workers, Redis queues, and private networking fit the simplified architecture.

The fastest responsible path is:

1. Measure wake waterfall.
2. Fix current wake sharp edges.
3. Build shared chat runtime with fallback.
4. Extract FFmpeg/browser/project work into services.
5. Retire per-user Machines only where isolation is no longer needed.
