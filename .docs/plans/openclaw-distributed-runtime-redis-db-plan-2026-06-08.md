# OpenClaw Distributed Runtime With Redis and DB Sessions Plan

Date: 2026-06-08
Status: Production queue path implemented behind flags - queued chat execution, Redis streaming, mission-worker processor, and OpenClaw chat lanes are ready for controlled rollout
Related plans:

- `.docs/plans/shared-railway-agent-runtime-pilot-2026-06-08.md`
- `.docs/plans/openclaw-db-sessions.md`
- `.docs/analysis/runtime-infrastructure-architecture-2026-06-08.md`

## Architect Summary

Today, Railway is one shared office with several desks. OpenClaw already has multiple desks, but all normal chat work still passes through one shared front desk called the main lane. When a long Atlas or mission job is ahead in that line, a user's normal chat can wait even when the user, conversation, and workspace are tenant-scoped.

The target is a dispatch center. Every chat, task, brain job, mission, or artifact job becomes a job ticket. Redis handles fast dispatch and live streaming. The database is the filing cabinet that remembers the durable truth: what was queued, who owns it, what session it belongs to, what worker claimed it, what finished, and what failed.

The core design rule is not "one lane per user." A single user can validly run five Vibey tasks, two other-agent tasks, brain jobs, and missions at the same time. We only serialize real conflicts: the same conversation, the same OpenClaw session, the same DB-owned resource mutation, the same browser/profile state, external side effects, or OpenClaw config mutation.

The recommended direction is a BullMQ/Redis-backed distributed runtime dispatcher with DB-backed run/session truth, reusing the existing `mission-worker` / `queue-worker` patterns instead of inventing a new queue engine. OpenClaw lanes stay, but they become local/resource conflict locks rather than the global execution model. Railway replicas become more worker capacity once session state and ownership are portable.

## CTO Decision Snapshot

- Dedicated workload queues are approved.
- Chat gets its own high-priority fast lane.
- Runtime queues reuse the existing BullMQ/Redis/outbox/watchdog pattern from `mission-worker` and `queue-worker`.
- Chat autoscaling triggers when chat claim latency exceeds 10 seconds sustained.
- Streaming migration is TDD-first: Redis stream output must match today's in-process stream before the worker flip.
- Durable artifacts, documents, and generated product state are DB-only; no per-run disk isolation is required for those paths.
- Automations are first-class runtime work and get their own queue/cap.
- Chat recovery/resume is mandatory: worker owner, heartbeat, timeout, Redis cursor, and DB terminal state.
- Subagent capacity is still a verification item: if parent runs hold execution slots while waiting, subagents need reserved/separate/autoscaled capacity; if parent runs yield, no special subagent lane is required.
- Provider limits are a future scale guardrail, not a blocker for the current four-org / 25-30-user planning target.

## Current Implementation State

- Phase 5.5 stream safety:
  - Pre-run setup/platform events are buffered and mirrored into Redis before `message_start`.
  - `CHAT_STREAM_SHADOW_VERIFY=1` compares live UI-contract events against Redis appends without changing the user path.
  - `CHAT_STREAM_REDIS_READER=1` lets the direct-mode HTTP stream switch from direct callback forwarding to Redis reads after the cursor-bearing `message_start` anchor, while execution still runs in-process.
  - `credit_update` remains explicitly live-only after `done`.
- Phase 1 durable run records:
  - `agent_runtime_runs` migration now stores ownership, idempotency, workload, status, priority, queue/worker claim metadata, payload/result, and terminal timestamps.
  - Chat run start/done/failed writes are shadow metadata only; live execution does not read from this table yet.
- Phase 3/6 runtime queue:
  - `AgentRuntimeQueueService` can enqueue deterministic BullMQ shadow chat jobs when `AGENT_RUNTIME_QUEUE_SHADOW=1`.
  - `AgentRuntimeQueueService` can enqueue deterministic real chat jobs when `AGENT_RUNTIME_QUEUE_EXECUTION=1`; real jobs use single-attempt BullMQ semantics to avoid duplicate assistant message creation.
  - `mission-worker` owns `agent-runtime-queue-chat`; shadow jobs still record claim latency, and real `chat-run` jobs call the Agent API internal executor with NDJSON heartbeats.
  - Worker claim writes `worker_id`, `claimed_at`, `heartbeat_at`, and queue claim latency metadata to `agent_runtime_runs`; terminal failure can be written locally to Redis and DB if Agent API cannot complete.
  - Runtime queue Redis resolves through `REDIS_URL_AGENT_QUEUE`, then `REDIS_URL_AGENT_STREAM`, then `REDIS_URL_MISSIONS`, then `REDIS_URL`, so Agent API can reuse the existing chat stream Redis when mission-worker is pointed at the same Redis and `REDIS_QUEUE_PREFIX`.
- Phase 6 queued chat path:
  - `ChatController` creates the run, requires the durable row before enqueue, enqueues `chat-run`, and streams the browser from Redis from cursor `0-0`.
  - `InternalChatRuntimeController` runs the existing `ChatService.processMessage` logic under internal auth, using the queued `runId/messageId`, user-scoped Supabase client, Redis cancellation polling, and NDJSON heartbeats for the worker request.
  - `POST /api/chat/stop` cancels the Redis/DB active run, so stop works across Agent API/worker instances instead of relying only on the local stream registry.
- Phase 7 lane fan-out:
  - Agent API sends `lane: chat:{conversationId}` to OpenClaw.
  - OpenClaw `/v1/responses` accepts `lane` and forwards it into `agentCommand`, so unrelated conversations no longer default to the shared `main` lane.
  - Agent API compatibility retry strips `lane` if an older gateway rejects the field, preserving deploy-order safety.

## Evidence Pack

- `apps/openclaw/src/process/command-queue.ts`
  - OpenClaw queue state is process-local: `const lanes = new Map<string, LaneState>()`.
  - Each lane has a queue and active task set, but that state is not shared across replicas.
  - `setCommandLaneConcurrency` only changes concurrency for the current process.

- `apps/openclaw/src/agents/pi-embedded-runner/run.ts`
  - Every embedded run enters both a session lane and a global lane.
  - The session lane is derived from `sessionKey` or `sessionId`.
  - The global lane defaults through `resolveGlobalLane(params.lane)`.

- `apps/openclaw/src/agents/pi-embedded-runner/lanes.ts`
  - Missing lane values default to `CommandLane.Main`.
  - This means default chat requests go to the shared `main` lane unless the caller passes a lane.

- `apps/openclaw/src/config/agent-limits.ts`
  - Default `main` concurrency is `4`.
  - Default `subagent` concurrency is `8`.
  - This proves OpenClaw is not strictly single-threaded, but the scheduling boundary is still coarse and process-local.

- `apps/openclaw/src/gateway/server-lanes.ts`
  - Gateway startup applies concurrency only to `cron`, `main`, and `subagent`.
  - There is no tenant-aware or workload-aware dynamic lane setup.

- `apps/agent-api/src/modules/chat/services/chat-run-event-store.service.ts`
  - Redis is already wired through `REDIS_URL_AGENT_STREAM` or `REDIS_URL`.
  - The runtime queue producer also reuses `REDIS_URL_AGENT_STREAM` when `REDIS_URL_AGENT_QUEUE` is absent.
  - It stores chat run metadata, active conversation run keys, conversation locks, and Redis Stream events.
  - It remains the chat resume/event store and chat runtime producer; BullMQ remains the distributed queue engine.

- `apps/agent-api/src/modules/chat/services/stream-registry.service.ts`
  - Active stream and abort state still use process-local maps.
  - This cannot stop or observe runs owned by another Railway replica.

- `apps/openclaw/src/config/sessions/storage-sync.ts`
  - Session persistence downloads local JSONL/session store files from Agent API when missing.
  - Session persistence uploads local JSONL/session store files after runs.
  - This is restart survival, not transactional live session ownership.

- `apps/agent-api/src/modules/sessions/sessions-storage.service.ts`
  - Agent API stores session transcripts and `sessions.json` in Supabase Storage bucket `session_transcripts`.
  - Storage paths are object paths by `agentId` and `sessionId`, not DB rows with version/claim semantics.

- `apps/agent-api/src/modules/chat/services/tracing.service.ts`
  - `vb_agent_traces` already records durable trace lifecycle with `streaming`, `completed`, and `failed`.
  - It is trace observability, not a complete run ownership/queue table.

- `apps/mission-worker/src/app.module.ts` and `apps/queue-worker/src/app.module.ts`
  - Existing worker services already use BullMQ with Redis connection configuration and default job options.
  - This is the queue infrastructure pattern to reuse for runtime work.

- `apps/mission-worker/src/modules/missions/services/missions.outbox-dispatcher.service.ts`
  - Mission work already uses DB outbox dispatch, `FOR UPDATE SKIP LOCKED`, deterministic BullMQ `jobId`, retry/dead-letter behavior, and stale active job recovery.
  - This is the closest existing pattern for durable runtime job dispatch.

- `apps/mission-worker/src/modules/missions/processors/missions.processor.ts`
  - Mission workers already run with explicit concurrency caps.
  - This proves caps are expected worker-pool knobs, not a reason to avoid queues.

- `.docs/plans/openclaw-db-sessions.md`
  - Existing direction already states DB should be the source of truth and OpenClaw should become stateless for chat.
  - This distributed runtime plan extends that direction from context/session correctness into scheduling and worker execution.

- `.docs/analysis/runtime-infrastructure-architecture-2026-06-08.md`
  - The previous architecture analysis already identified required changes: request-scoped tenant identity, namespaced sessions/workspaces, external session state, capacity-aware scheduler, backpressure, and no-sticky-session safety.

## Current Root Cause

The current shared Railway pilot removed the Fly machine cold start, but it did not replace OpenClaw's process-local execution scheduler.

The actual chain is:

1. User sends a chat message.
2. Web routes the user to the shared Railway Agent API.
3. Agent API creates the assistant message and Redis chat resume metadata.
4. Agent API calls OpenClaw `/v1/responses`.
5. OpenClaw creates a run in the current process.
6. The run enters the session lane and then the global lane.
7. Unrelated users and background work can share the same global lane capacity.
8. Railway replicas cannot safely help unless run ownership and session state are externalized.

## Recommended Approach

Use a three-layer runtime model:

1. **Database as durable truth**
   - Stores run records, session metadata, session events/messages, result status, worker claims, and cancellation state.
   - Answers "what happened?" after restarts and across replicas.

2. **Redis/BullMQ as hot coordination**
   - Stores BullMQ workload queues, live run events, active locks, worker heartbeats, and cancellation pub/sub or polling keys.
   - Optimized for speed and cross-replica coordination.

3. **OpenClaw workers as execution capacity**
   - Workers claim BullMQ jobs, hydrate request/session context, run OpenClaw, stream events back to Redis, and persist terminal state to DB.
   - Lanes remain as local conflict locks where needed, not the main product-level scheduler.

### Session Model: Log/Document, Not Event Rows

A session is one ordered append-only log of entries (user message, assistant message, tool call, tool result). A long run with 500 tool calls is a longer log, not 500 relational rows.

Storage by lifetime:

- **Redis** holds the live log while a run is in flight (fast appends, short TTL). This also feeds the UI.
- **Postgres** holds one small row per session and one per run: metadata, version, summary, and a pointer to the durable log. The 500 tool calls do not become 500 rows.
- **Supabase Storage** holds the full transcript blob (the document) when the log is large, with the DB row holding the pointer and version.

Row math at scale stays small because we never store per-event rows for the transcript:

- ~1 row per run (e.g. ~560k/week at the stated load) — trivial for Postgres.
- ~1 session row per conversation (updated, not inserted per event).
- The heavy content lives inside one versioned log artifact, not row spam.

This preserves full agent fidelity (nothing is truncated or capped) while keeping the relational footprint tiny.

For chat specifically, the cleanest variant is deterministic reconstruction: the `messages` table plus a conversation summary is the session memory, OpenClaw stays mostly stateless, and we may not persist OpenClaw's internal JSONL at all. The log/document artifact is needed mainly for complex multi-tool/subagent runs and for crash-resume checkpoints.

## Non-Goals For This Plan

- Do not remove Fly fallback until shared runtime passes isolation and load gates.
- Do not route every tool path through shared workers until browser/project/media side effects are audited.
- Do not rely on Railway sticky sessions.
- Do not use local Railway volumes for live session truth if replicas are needed.
- Do not serialize all work by user; that blocks the user-level concurrency requirement.

## Data And Contract Map

- Input:
  - Studio chat messages.
  - Agent task/delegation requests.
  - Brain jobs.
  - Mission jobs.
  - Artifact generation/improvement jobs.

- Validation:
  - Existing Agent API auth and org guards remain the first boundary for user-facing chat.
  - Worker-claimed jobs must be validated against durable run records before execution.

- AuthZ/AuthN:
  - User/org ownership lives in the durable run row.
  - Worker calls use internal auth, but every job carries user/org/agent identity from the DB row.

- Storage (by lifetime, not by record type):
  - Redis: queue, live ordered stream events, locks, heartbeats, cancellation signal, hot in-flight session log. Short TTL.
  - DB: small durable rows — one per run, one per session (metadata, version, summary, pointer), final message, important step summaries. No per-token/per-event row spam.
  - Supabase Storage: full transcript blob (the session document) when large; archival/debug, not the live source of truth.

- Output:
  - Redis stream events for live UI.
  - DB updates for final answer, trace, usage, and terminal status.

- Side effects:
  - Message rows created/updated.
  - Timeline events appended.
  - Durable artifacts, documents, and generated product state are DB-only.
  - Browser/profile, external side-effect, and config mutation paths are updated only under explicit locks.
  - Usage and credits processed after successful model work.

- Idempotency:
  - Every job needs an idempotency key.
  - Worker claim must be atomic.
  - Terminal writes must be safe to retry.

## Step-By-Step Implementation Plan

### Phase 0: Confirm Infrastructure and Runtime Limits

1. Railway Redis
   - Change: verify `REDIS_URL` / `REDIS_URL_AGENT_STREAM` is present in the Railway Agent API environment.
   - Why: `ChatRunEventStoreService` already depends on those variables.
   - Contract: Redis must be reachable from every Agent API and worker replica.
   - Tests: runtime health check should include Redis availability without blocking existing single-replica chat.

2. Railway service sizing
   - Change: document current CPU/RAM and replica settings for the shared runtime.
   - Why: worker concurrency must be tied to actual CPU capacity.
   - Contract: no default concurrency increase without a sizing value.
   - Tests: manual Railway metrics baseline under one chat, one brain job, and one mission job.

### Phase 1: Durable Run Records

1. Supabase migration: new run table
   - Change: add a durable run table, tentatively `agent_runtime_runs`.
   - Current implementation: `supabase/migrations/20260608192301_agent_runtime_runs.sql` creates `agent_runtime_runs` with the required scheduler ownership fields plus `claim_expires_at`, `heartbeat_at`, `ended_at`, and `metadata`.
   - Required fields:
     - `id`
     - `idempotency_key`
     - `user_id`
     - `org_id`
     - `conversation_id`
     - `message_id`
     - `agent_key`
     - `gateway_agent_id`
     - `session_key`
     - `workload_type`
     - `status`
     - `priority`
     - `queue_name`
     - `worker_id`
     - `claimed_at`
     - `started_at`
     - `completed_at`
     - `failed_at`
     - `cancelled_at`
     - `error`
     - `payload`
     - `result`
     - `created_at`
     - `updated_at`
   - Why: `vb_agent_traces` records observability, but it is not a scheduler ownership table.
   - Contract: DB is authoritative for run ownership and terminal state.
   - Tests: insert, claim, complete, fail, cancel, duplicate idempotency key.

2. Run step summary (low volume, NOT per-event)
   - Change: store only meaningful run milestones, not stream deltas. Either a small `result`/`steps` JSON column on `agent_runtime_runs` or a low-volume `agent_runtime_run_steps` table.
   - Allowed milestones only: `queued`, `started`, `tool_called`, `tool_done`, `message_saved`, `completed`, `failed`.
   - Why: per-token/per-delta rows would be tens of millions/week at the stated load; milestones are ~5-20 per run.
   - Contract: Postgres never stores stream deltas. Deltas live in Redis (live) and the session log document (durable).
   - Tests: a 500-tool-call run produces one run row plus a bounded milestone set, never hundreds of delta rows.

### Phase 2: Autoscaling Signal and Capacity Control

Goal: make capacity lead demand so interactive runs are claimed near-instantly (queue depth ≈ 0), and shed/scale predictably under load. This phase defines the autoscaling policy and controller. Its input signals come online with the queue (Phase 3) and workers (Phase 6); its decisions govern activation of replica scaling (Phase 9). The plan must not assume Railway provides metric-based autoscale out of the box — it is treated as limited until verified.

CTO decision: chat scale-up uses a sustained 10-second claim-latency threshold. Queue depth remains an early warning signal, but the user-visible trigger is "how long did chat wait before a worker claimed it?"

1. Define the scaling signals
   - Change: standardize three signals, emitted per workload queue:
     - `queue_depth` — items waiting to be claimed in `agent-runtime-queue-{workload}`.
     - `claim_latency_ms` — time from enqueue to worker claim (the real "is the user waiting?" metric).
     - `capacity_utilization` — active runs vs total worker slots per replica/workload.
   - Why: CPU alone is a poor signal for LLM/IO-bound agent work; claim latency directly reflects user-visible queueing.
   - Contract: signals are derived from the queue/worker layer, not guessed; chat uses `claim_latency_ms` as the primary trigger.
   - Tests: synthetic load produces expected depth/latency/utilization values.

2. Define the scaling policy (per workload)
   - Change: set explicit targets and thresholds, configurable without code deploy:
     - chat: scale up when `claim_latency_ms` exceeds `10_000` ms sustained.
     - brain/mission/artifact/automation: scale by throughput/`queue_depth`, not by per-item latency.
     - scale down when depth is 0 and utilization is low for a cooldown window.
   - Why: chat optimizes for latency; background work optimizes for throughput.
   - Contract: each workload has its own min/max replicas, target, and cooldown.
   - Tests: depth/latency above target triggers scale-up decision; sustained idle triggers scale-down after cooldown.

3. Choose the scaling mechanism (decision required)
   - Change: pick and document one:
     - (a) Railway native replica autoscale IF it supports a usable metric trigger (verify first).
     - (b) external controller (small service or cron) that reads the signals and calls the Railway API (or Fly Machines API) to set replica/worker count.
     - (c) hybrid: warm baseline replicas always on, controller adds burst capacity.
   - Why: "auto scale" must name the actuator, not assume the host does it.
   - Contract: exactly one actuator owns replica count; it is idempotent and rate-limited.
   - Tests: controller converts a scale decision into the correct target replica count via the chosen API (mocked).

4. Provider-capacity guardrail (future scale note)
   - Change: keep provider/OpenRouter limits as a future guardrail before many-org scale, not as a blocker for the current four-org / 25-30-user target.
   - Why: at the current planning scale, worker/container capacity is the immediate constraint; provider caps become important when model call volume grows across many orgs.
   - Contract: initial autoscaling is bounded by workload max replicas, CPU/RAM, and cost ceilings; provider-capacity ceilings are added before broad multi-org rollout.
   - Tests: future provider-capacity tests are required before raising the scale target beyond the current planning band.

5. Guardrails
   - Change: enforce `min_replicas` (warm floor, no cold start), `max_replicas` (cost ceiling), cooldown windows (anti-flapping), and per-tenant fairness caps so one tenant cannot consume all burst capacity.
   - Why: protect cost, stability, and multi-tenant fairness.
   - Contract: scaling decisions are bounded and logged with the triggering signal.
   - Tests: flapping load does not oscillate replicas; one tenant's burst cannot starve others.

6. Observability hooks
   - Change: emit `autoscale_signal`, `autoscale_decision`, `autoscale_actuated`, and future `provider_capacity_guardrail` events feeding the Phase 10 observability layer.
   - Why: scaling behavior must be auditable and tunable.
   - Contract: every replica-count change is traceable to a signal and policy.
   - Tests: decision and actuation logs emitted for scale-up, scale-down, and future guardrail cases.

### Phase 3: BullMQ Runtime Queue Abstraction

1. New runtime queue module using the existing worker pattern
   - Change: create an `AgentRuntimeQueueService` / runtime queue module that wraps BullMQ queues and DB run/outbox rows, following the existing `mission-worker` and `queue-worker` Redis configuration, retry, dead-letter, and watchdog patterns.
   - Current implementation: `AgentRuntimeQueueService` is flag-gated by `AGENT_RUNTIME_QUEUE_SHADOW=1` and enqueues no-op chat shadow jobs only after the DB start row is persisted; mission-worker owns the no-op shadow chat processor.
   - Why: `ChatRunEventStoreService` is specific to chat resume and should not become a generic scheduler by accident; the repo already has proven BullMQ/Redis plumbing, so runtime work should reuse it instead of inventing a custom Redis claim loop.
   - Contract:
     - enqueue writes the DB run/outbox row first, then adds a BullMQ job with a deterministic `jobId`.
     - worker processors verify the DB run row before execution.
     - heartbeat, completion, failure, cancellation, and requeue update DB and emit Redis terminal events.
     - raw Redis Streams are only used for live run events/resume, not as the primary queue engine unless a spike proves BullMQ cannot meet the runtime contract.
   - Tests: no Redis configured, BullMQ enqueue success, enqueue failure after DB insert, duplicate idempotency, worker retry, dead-letter, stale claimed run recovery.

2. Queue names
   - Change: define explicit queue names:
     - `agent-runtime-queue-chat`
     - `agent-runtime-queue-brain`
     - `agent-runtime-queue-mission`
     - `agent-runtime-queue-artifact`
     - `agent-runtime-queue-automation`
     - `agent-runtime-queue-subagent` only if Phase 7 verification proves parent runs hold execution slots while waiting for subagents.
   - Current implementation: code constants currently define `chat`, `brain`, `mission`, `artifact`, `automation`, and `sub_agent`; only `chat` is wired to BullMQ in shadow mode.
   - Why: chat must not wait behind long brain/mission work.
   - Contract: workload type maps deterministically to one queue.
   - Tests: each workload maps to expected queue.

3. Worker caps as capacity knobs
   - Change: define per-queue processor concurrency and per-gateway capacity limits together.
   - Why: BullMQ concurrency does not remove caps; it makes them explicit, observable, and autoscalable by workload.
   - Contract: total claimed jobs for a workload never exceeds configured worker slots and OpenClaw gateway capacity.
   - Tests: queue can hold more jobs than workers can run, while active jobs stay within caps.

### Phase 4: Distributed Locks

1. Conversation lock
   - Change: keep one active run per conversation.
   - Why: existing `tryAcquireConversationLock` already enforces this for chat.
   - Contract: same conversation cannot run two chat turns at once.
   - Tests: two jobs for same conversation, one runs and one is rejected or queued behind it.

2. Session lock
   - Change: add `lock:session:{sessionKey}` for session-mutating work.
   - Why: OpenClaw session transcript writes are parent-chain sensitive and must not interleave for the same session.
   - Contract: different sessions may run in parallel; same session serializes.
   - Tests: same session serializes, different sessions parallelize.

3. Shared resource lock
   - Change: do not add a broad durable-artifact workspace lock for artifacts/docs because durable product state is DB-only. Add explicit locks only for proven conflicts: same DB record mutation, browser/profile state, external side effects, or future tool paths that actually write local runtime files.
   - Why: locking a whole workspace would serialize safe DB-only work unnecessarily; conflicts should match real mutable resources.
   - Contract: read-only chat and DB-only independent work avoid workspace serialization; conflicting DB/browser/external/config paths acquire the specific resource lock.
   - Tests: two writes to the same DB-owned resource serialize; two independent DB-only runs parallelize; browser/profile mutation serializes if present.

4. Config mutation lock
   - Change: replace process-local OpenClaw config mutation queue with Redis lock before multi-replica rollout.
   - Why: current config mutation protection is single-process only.
   - Contract: only one materialization/config mutation across all replicas at a time per config path or agent id.
   - Tests: concurrent first-time agent materialization from two workers keeps both config entries.

### Phase 5: Durable Session as a Versioned Log/Document

The session is modeled as one append-only log, not relational event rows. See "Session Model: Log/Document, Not Event Rows" above. This phase makes that log durable and replica-readable without row spam and without truncating fidelity.

1. Chat path: deterministic reconstruction first
   - Change: for chat, treat the existing `messages` table plus conversation summary as session memory; keep OpenClaw mostly stateless via the Responses `input` array (aligns with `.docs/plans/openclaw-db-sessions.md`).
   - Why: chat does not need OpenClaw's local JSONL if context is rebuilt from DB each turn; this removes the hardest cross-replica state problem for the highest-volume path.
   - Contract: any worker can serve any turn because context comes from DB, not local files.
   - Tests: worker A handles turn 1, worker B handles turn 2 with identical full context.

2. Session metadata row (one per session, low volume)
   - Change: add `agent_runtime_sessions` holding the pointer/version, not the transcript body.
   - Fields:
     - `id`
     - `session_key`
     - `agent_id`
     - `user_id`
     - `org_id`
     - `conversation_id`
     - `version`
     - `summary`
     - `log_location` (inline jsonb vs storage pointer)
     - `last_message_id`
     - `created_at`
     - `updated_at`
   - Why: this row is the small, queryable truth for "what is the latest version and where is the log."
   - Contract: one row per session, updated with optimistic version bump; never one row per event.
   - Tests: optimistic concurrency conflict, retry, version monotonicity.

3. Log document storage (for complex tool/subagent runs)
   - Change: persist the full ordered log as ONE artifact — small logs inline as jsonb on the session row; large logs as a Supabase Storage object referenced by `log_location`.
   - Why: a 500-tool-call session is a bigger document, not 500 rows; this keeps fidelity at 100% and rows tiny.
   - Contract: the durable log is written whole at checkpoints/run end; Redis holds the live copy during the run.
   - Tests: large session round-trips intact; pointer + version resolve to the exact log; nothing truncated.

4. Checkpointing
   - Change: flush the live Redis log to the durable artifact at run end and at coarse checkpoints (e.g. each turn boundary), not per delta.
   - Why: enables crash-resume and next-turn memory without per-event Postgres writes.
   - Contract: a crashed run requeues and resumes from the last durable checkpoint.
   - Tests: kill mid-run, requeue, resume from checkpoint with intact prior log.

### Phase 5.5: Zero-Loss SSE Migration (precondition for moving execution)

The UI contract is the SSE event sequence, not the transport. If the exact same events arrive in the exact same order, the app cannot tell whether they came from the in-process `send()` callback or from a Redis replay. This phase proves that equivalence before any execution moves off the request path. Nothing here changes UI behavior.

Current state (partially implemented): the Redis mirror is already ahead of the earlier draft for the main chat run path because most main run events flow through `sendRunEvent` / `progressiveSend` into Redis. On 2026-06-08, pre-run setup/platform-context events were covered by a regression test and mirrored into Redis before stored `message_start`, preserving the live SSE order without double-sending to the active client. Remaining explicit live-only gap: post-run `credit_update`, which can arrive after `done` and is not part of active run replay unless we later decide to make credit balance recovery block or extend stream completion. The migration remains TDD-first: capture today's in-process event log as the golden contract, then require the Redis stream to match it before any reader or worker flip.

Ordering guarantee: single ordered writer → Redis Stream → monotonic cursors → reader forwards in cursor order and tracks last delivered cursor. This gives no loss, no dupes, no reorder. Content blocks rebuild identically because the client reducer sees the identical event order.

Existing safety nets to preserve throughout:

- DB final flush in `ChatService` `finally` saves full content even if the stream dies.
- `content_blocks_ordered` in message metadata is the durable block truth.
- `resumeRunStream` is the proven Redis-to-SSE reader shape.
- Redis conversation lock prevents double runs.

1. Single-writer mirror (additive, no behavior change)
   - Change: route 100% of UI-contract SSE events through one function that appends to Redis then sends SSE. Nothing emits a UI-contract event without a Redis append.
   - Why: Redis must be a complete, ordered mirror before it can be the source.
   - Contract: every event the UI receives also exists in the Redis stream, in the same order, with a cursor.
   - Tests: per-type event counts match between SSE and Redis for a full run including deltas, tools, reasoning.

2. Shadow verification (no flip)
   - Change: write golden stream tests first, then compare events sent to UI vs events in Redis vs final `content_blocks_ordered`; assert same count per type, same order, same final content.
   - Why: do not flip the read path until equivalence holds in production silently.
   - Contract: mismatch raises an alert and blocks the flip; no user impact.
   - Tests: synthetic runs with deltas/tools/reasoning/errors all reconcile.

3. Flip the reader (execution still in-process)
   - Change: the browser stream reads from Redis (generalized `resumeRunStream`) instead of the direct callback; execution still runs on the same box; fall back to the direct path if Redis is unavailable.
   - Why: proves Redis-as-source with zero topology change and instant rollback.
   - Contract: byte-identical event stream to the client; same-machine fallback on Redis failure.
   - Tests: side-by-side run produces identical client event log via Redis reader vs direct callback.

4. Flag gating
   - Change: gate the reader flip per conversation/user so rollout is 1% → 10% → 100% and reversible.
   - Why: no big-bang switch on the live chat path.
   - Contract: flag off restores the exact current behavior.
   - Tests: flag toggling does not drop or reorder events.

Only after Phase 5.5 holds in shadow and at 100% may execution move to workers (Phase 6).

### Phase 6: Worker Process Mode

1. New Agent API runtime worker entry
   - Change: add a worker process mode that consumes BullMQ runtime queues and executes OpenClaw work.
   - Current implementation: mission-worker consumes real `chat-run` BullMQ jobs and calls Agent API's internal queued chat executor, which preserves the existing `ChatService` stream/persistence behavior while moving browser requests to Redis streaming.
   - Why: HTTP request handlers should enqueue and stream; workers should own execution.
   - Contract:
     - worker claims one job at a time per configured capacity slot.
     - worker emits Redis run events compatible with chat resume.
     - worker persists DB terminal state.
   - Tests: worker claims queued run, emits started/delta/done, marks DB completed.

2. Chat request path
   - Change: `ChatController` creates message/run records and enqueues a chat job instead of directly awaiting `ChatService.processMessage`.
   - Current implementation: enabled by `AGENT_RUNTIME_QUEUE_EXECUTION=1`; direct in-process execution remains the rollback path when the flag is off.
   - Why: browser request should not own the execution process.
   - Contract: SSE stream reads Redis events for the run.
   - Tests: disconnect and reconnect while worker continues.

3. Stop/cancel
   - Change: `POST /chat/stop` updates DB/Redis cancellation state instead of only aborting local `StreamRegistryService`.
   - Current implementation: stop now cancels the active Redis run and workers poll cancellation while executing.
   - Why: worker may live in another process or replica.
   - Contract: worker checks cancellation before model calls, during stream, and before final writes.
   - Tests: cancel queued job, cancel running job, cancel after done is no-op.

### Phase 7: OpenClaw Lane Refactor

1. Replace product-level global lane with workload/run scheduler
   - Change: default OpenClaw `/v1/responses` runs should receive explicit lane/resource metadata from Agent API.
   - Current implementation: chat requests pass `lane: chat:{conversationId}` through the OpenResponses schema into `agentCommand`.
   - Why: missing lane currently defaults to `main`.
   - Contract: Agent API chooses workload lane; OpenClaw no longer silently funnels all shared chat into `main`.
   - Tests: chat job uses chat lane, brain job uses brain lane, and subagent job uses reserved subagent capacity only if Phase 7 verification requires it.

2. Keep local lanes as conflict locks
   - Change: preserve session lane semantics inside OpenClaw.
   - Why: same-session transcript writes must stay serialized.
   - Contract: session lane remains per session; global lane no longer blocks unrelated runs.
   - Tests: two different sessions execute concurrently; same session serializes.

3. Tool safety classification
   - Change: classify tools as:
     - stateless/read-only
     - session-mutating
     - DB-resource-mutating
     - browser/profile-mutating
     - external side-effect
   - Why: only conflicting tools should acquire heavier locks.
   - Contract: tool execution requests required locks before running.
   - Tests: write/edit/browser paths acquire expected lock; pure LLM/chat path does not.

4. Subagent capacity verification
   - Change: verify whether a parent OpenClaw run keeps its execution slot while waiting for a subagent run.
   - Why: if parents hold all slots while waiting, subagents can queue behind the parents and create a capacity deadlock even though subagents are different agents/sessions.
   - Contract:
     - if parent runs hold slots, enable a reserved/separate/autoscaled subagent lane.
     - if parent runs yield slots while waiting, no special subagent lane is required.
   - Tests: saturate parent runs that request subagents and confirm subagents still claim capacity without waiting for parent slots to free.

### Phase 8: Workload Separation

1. Chat workers
   - Change: high-priority chat queue with strict first-token SLO.
   - Why: users should not wait behind long background work.
   - Contract: chat has separate capacity and backpressure; autoscale triggers when chat claim latency exceeds 10 seconds sustained.
   - Tests: brain queue saturated, chat still starts within target.

2. Brain workers
   - Change: brain queue with lower priority and bounded concurrency.
   - Why: brain jobs can be long and token-heavy.
   - Contract: brain jobs cannot consume all chat capacity.
   - Tests: multiple brain jobs do not delay chat queue.

3. Mission/artifact workers
   - Change: mission and artifact queues separated from chat.
   - Why: mission/artifact work may involve longer DB, tool, browser/profile, or external side effects.
   - Contract: these jobs acquire only the specific DB/session/browser/external locks they need.
   - Tests: mission queue saturation does not block chat queue.

4. Automation workers
   - Change: automation queue separated from chat, brain, mission, and artifact work.
   - Why: automations can become noisy background work and should not consume chat capacity or be hidden inside another queue.
   - Contract: automation has its own cap, priority, retry policy, and backpressure.
   - Tests: automation queue saturation does not delay chat; failed automation retries do not duplicate side effects.

5. Subagent capacity lane (verification-dependent)
   - Change: add a reserved/autoscaled subagent queue only if Phase 7 proves parent runs hold execution slots while waiting.
   - Why: subagents are different sessions, but they still need execution capacity; identity separation does not solve slot starvation.
   - Contract: subagent queue/cap exists only when needed by measured OpenClaw behavior.
   - Tests: 20 parent runs that spawn subagents do not block all subagent starts.

### Phase 9: Railway Replica Scaling

1. Replica-safe runtime
   - Change: enable more than one Railway replica only after:
     - run ownership is in DB,
     - queue is in Redis,
     - cancellation is distributed,
     - session truth is DB-backed,
     - config mutation lock is Redis-backed,
     - local volume is not required for live state.
   - Why: Railway replicas do not provide sticky sessions, and volumes do not support replicas.
   - Contract: any replica can serve SSE and any worker can claim eligible work.
   - Tests: two replicas, turn 1 on replica A, reconnect to replica B, worker on replica C completes.

2. Capacity controls
   - Change: define per-replica worker slots by workload.
   - Initial shape:
     - chat: CPU-bound slot count
     - brain: lower slot count
     - mission/artifact/automation: lock-aware slot count
     - subagent: reserved/autoscaled slot count only if Phase 7 requires it.
   - Why: total concurrency must not exceed CPU/RAM, OpenClaw gateway capacity, and configured cost ceilings.
   - Contract: capacity can be changed without code deployment.
   - Tests: concurrency caps enforced under queue load.

3. Activate the Phase 2 autoscaler
   - Change: connect the Phase 2 autoscaling controller to drive replica count from `queue_depth` / `claim_latency_ms`, bounded by `min_replicas`, `max_replicas`, cooldown, CPU/RAM, gateway capacity, and configured cost ceilings.
   - Why: replica scaling is only "automatic" once the Phase 2 controller owns the actuator; before that it is manual.
   - Contract: replica count changes are produced by the Phase 2 policy, not by hand; future provider-capacity ceilings are added before broad many-org scale.
   - Tests: chat claim latency above 10 seconds triggers scale-up; sustained idle triggers scale-down after cooldown; configured max capacity blocks further scale-up.

### Phase 10: Observability and Backpressure

1. Metrics/logs
   - Change: add structured events for:
     - `run_queued`
     - `run_claimed`
     - `lock_wait_start`
     - `lock_acquired`
     - `worker_started`
     - `first_token`
     - `run_completed`
     - `run_failed`
     - `run_cancelled`
     - `requeued_after_worker_timeout`
   - Why: queue wait and lock wait must be visible separately.
   - Contract: every run can be traced from request to worker to terminal state.
   - Tests: logs emitted for happy path and failure path.

2. Backpressure
   - Change: reject or delay lower-priority work when queues exceed capacity thresholds.
   - Why: unlimited queue growth hides overload and hurts UX.
   - Contract: chat gets clear user-facing status; background jobs get retryable status.
   - Tests: saturated queue returns expected status without orphaning DB run.

## Test Plan

### Unit Tests

- Runtime BullMQ adapter / `AgentRuntimeQueueService`
  - enqueue creates DB run/outbox row and BullMQ job.
  - duplicate idempotency key returns existing run.
  - worker claim verifies DB run state before execution.
  - complete/fail/cancel update DB and Redis terminal event.
  - retry/dead-letter behavior matches existing worker patterns.

- Lock service
  - conversation lock blocks same conversation.
  - session lock blocks same session.
  - DB resource lock blocks same resource writes.
  - browser/profile/external locks block only those side-effect paths.
  - locks expire and can be recovered after worker crash.

- Workload mapping
  - chat maps to chat queue.
  - brain maps to brain queue.
  - mission maps to mission queue.
  - artifact maps to artifact queue.
  - automation maps to automation queue.
  - subagent maps to subagent queue only if Phase 7 verification requires reserved capacity.

- Stream contract tests
  - current in-process SSE output becomes the golden event log.
  - Redis stream output matches event count, event type order, content blocks, terminal status, and reconnect cursor behavior.
  - pre-run setup/platform-context events and credit events are either included in the UI contract or explicitly excluded.

### Integration Tests

- Chat enqueue + SSE resume
  - start chat,
  - disconnect,
  - worker continues,
  - reconnect streams from Redis cursor,
  - DB message final content matches.

- Cross-replica ownership simulation
  - one test process enqueues,
  - another claims,
  - original reads Redis stream events.

- Same user high concurrency
  - five Vibey tasks,
  - two other-agent tasks,
  - one brain job,
  - two mission jobs,
  - one automation job,
  - verify only conflicting resources serialize.

- Different users high concurrency
  - same workload from two users,
  - verify no shared session, DB resource, browser/profile, or external-resource collision.

- Subagent slot behavior
  - saturate parent runs that spawn subagents,
  - verify whether parent runs hold or yield execution slots while waiting,
  - enable reserved/autoscaled subagent capacity only if needed.

### Manual / Load Tests

- Saturate brain queue and send chat.
- Saturate mission queue and send chat.
- Saturate automation queue and send chat.
- Run parent/subagent load test after Phase 7 verification harness exists.
- Run 2 Railway replicas and confirm reconnect works across replicas.
- Kill a worker during a run and verify requeue/terminal state behavior.
- Scale replicas up and down while runs are queued.

## Rollout And Verification

### Rollout Order

1. Keep current direct execution path.
2. Continue TDD golden stream tests for today's in-process SSE contract. Implemented regressions now cover pre-run setup/platform events and full gateway event ordering before `message_start`.
3. Complete the remaining single-writer Redis mirror gaps so every replay-contract event is in Redis, in order (Phase 5.5 step 1). Implemented for current replay-contract events; `credit_update` remains explicitly live-only unless credit replay becomes a requirement.
4. Run shadow verification of SSE vs Redis vs `content_blocks_ordered` until equivalence holds (Phase 5.5 step 2). Implemented behind `CHAT_STREAM_SHADOW_VERIFY=1`; production observation still required.
5. Flip the browser read path to Redis with execution still in-process, flag-gated 1% -> 100% (Phase 5.5 steps 3-4). Implemented behind `CHAT_STREAM_REDIS_READER=1`; rollout still required.
6. Add durable run records in shadow mode. Implemented for chat run start/done/failed.
7. Add BullMQ runtime queue adapter in shadow mode. Implemented for no-op chat shadow jobs and mission-worker claim-latency metadata.
8. Route one internal chat path through queue workers. Implemented behind `AGENT_RUNTIME_QUEUE_EXECUTION=1`.
9. Expand to all shared Railway chat after controlled production soak with `CHAT_STREAM_REDIS_READER=1` and `AGENT_RUNTIME_QUEUE_EXECUTION=1`.
10. Add brain queue.
11. Add mission/artifact queues.
12. Add automation queue.
13. Complete subagent capacity verification and add reserved/autoscaled subagent capacity only if needed.
14. Enable more Railway replicas and activate the Phase 2 autoscaler (10-second chat claim-latency driven, bounded by configured capacity).
15. Only then consider retiring per-user Fly for compatible flows.

### Verification Gates

- Gate 0 (precondition): Redis is a 100% complete, ordered mirror of the SSE stream; shadow verification shows zero event mismatch before any read-path flip.
- Gate 1: browser reads the live stream from Redis with byte-identical events while execution is still in-process.
- Gate 2: one chat runs through the queue+worker with no UX regression (no dropped/reordered events, identical content blocks).
- Gate 3: browser refresh/resume works while a worker owns execution.
- Gate 4: same user can run multiple independent tasks concurrently (only conflicting resources serialize).
- Gate 5: different users can run concurrently with no cross-tenant data.
- Gate 6: long brain/mission jobs do not delay chat first token.
- Gate 7: a 500-tool-call run persists as one run row plus a bounded milestone set and one session log document — no per-event row spam, no truncated fidelity.
- Gate 8: worker crash does not orphan a run; it resumes from the last durable log checkpoint.
- Gate 9: two Railway replicas pass reconnect and ownership tests.
- Gate 10: autoscaler scales replicas up when chat claim latency exceeds 10 seconds sustained, scales down after idle cooldown, and stops scaling up at configured capacity/cost ceilings.
- Gate 11: if subagents require reserved capacity, parent/subagent load tests prove subagents still start when parent runs are saturated.

### Rollback Path

- Keep profile-level runtime fallback to Fly.
- Keep direct in-process execution path behind a config flag until queue path is proven.
- If BullMQ/Redis queueing fails, stop routing new work to worker mode and use current Railway single-process path or Fly fallback.
- If session DB truth fails, keep Supabase Storage transcript sync as archival backup, not as the scaling mechanism.

## Missing Evidence

- BullMQ runtime adapter contract.
  - Current status: no-op chat shadow jobs and real chat-run jobs are implemented with deterministic `jobId`, single-attempt live execution, worker claim metadata, heartbeat timestamp, Redis/DB terminal failure fallback, and targeted tests.
  - Remaining evidence: dead-letter handling and stale claimed run recovery still need broader tests before background workloads move onto this runtime queue model.
  - Risk if skipped: the runtime queue can drift from the proven mission-worker failure model.

- Session manager append contract.
  - Smallest experiment: read the full OpenClaw `SessionManager` path and transcript parent-chain writes before changing live session storage.
  - Risk if skipped: DB-backed session writes can corrupt the parent-chain model.

- Tool safety inventory.
  - Smallest experiment: inventory OpenClaw tools and Vibey backend actions by read/write/browser/external side-effect behavior.
  - Risk if skipped: parallel runs can mutate the same DB resource, browser profile, or external resource.

- Subagent slot behavior.
  - Smallest experiment: run a parent/subagent saturation test and inspect whether parent runs hold OpenClaw execution slots while waiting for subagents.
  - Risk if skipped: subagents may queue behind parent runs under saturation and create avoidable 10+ second stalls.

- Production soak for queued chat.
  - Smallest experiment: deploy Agent API, mission-worker, and OpenClaw with `CHAT_STREAM_REDIS_READER=1`, `AGENT_RUNTIME_QUEUE_EXECUTION=1`, shared runtime Redis, `AGENT_API_URL`, and `INTERNAL_API_TOKEN`, then run multi-conversation chat load and verify `agent_runtime_runs` claim latency, Redis stream order, stop/cancel, and final message content.
  - Risk if skipped: code-level verification passes, but real Railway network, Redis, and worker sizing behavior remains unproven.

- Railway sizing.
  - Smallest experiment: record current Railway CPU/RAM/replica settings and load-test one chat plus one long background job.
  - Risk if skipped: worker slots may oversubscribe CPU and make latency worse.

- Railway autoscale actuator (Phase 2).
  - Smallest experiment: verify whether Railway supports a usable metric-driven replica autoscale; if not, prototype an external controller that sets replica count via the Railway API from `queue_depth`/`claim_latency_ms`.
  - Risk if skipped: "autoscale" stays manual; capacity does not lead demand and interactive runs queue under load.

- Provider rate limits (future scale guardrail, not current blocker).
  - Smallest experiment: document current provider/OpenRouter account limits before raising scale beyond the four-org / 25-30-user planning band.
  - Risk if skipped later: runtime capacity can exceed model provider capacity and produce rate-limit cascades at larger scale.

## Quality Control Summary

- This document now tracks implemented runtime code.
- Runtime code changed for Agent API, mission-worker, and OpenClaw lane forwarding.
- The plan preserves Fly fallback.
- The plan does not assume Railway sticky sessions.
- The plan avoids user-level serialization because the stated requirement needs one user to run many concurrent tasks.
- Old code removal is not applicable for this pass because the direct in-process chat path remains the rollback path behind flags.
