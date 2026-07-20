# Dream Ops

Last Modified: 2026-07-20

## Overview

Dream Ops is the shared scheduler and run ledger for background intelligence loops. It prevents every agent loop from inventing its own cron, outbox, dedupe, and run-history pattern.

The first operation types are:

- `company_daily_dream`: Atlas reviews Company Cortex activity.
- `agent_learning_dream`: Jaime reviews recent work for one org agent and proposes skill or agent-file improvements.

Dream Ops only queues work when the operation has evidence in the configured window. Empty windows create no outbox row and no run.

## Data Flow

1. Product-facing settings stay in their existing places.
2. Those settings sync into `dream_ops_settings` by org, operation, subject, local time, timezone, and lookback window.
3. `DreamOpsNightJanitorService` sweeps due settings every 6 hours by default.
4. `DreamOpsEligibilityService` checks source tables before queueing.
5. Eligible work inserts one deduped `dream_ops_outbox` row per org, subject, operation, and local date.
6. `DreamOpsOutboxDispatcherService` claims pending rows and publishes BullMQ jobs.
7. `DreamOpsProcessor` routes by `operation_type`.
8. Each run writes shared state to `dream_ops_runs`.
9. A successful run updates `dream_ops_settings.last_successful_run_at`. Successful Company Cortex dreams also update `company_cortex_settings.last_successful_dream_at`, which powers the Company Cortex status bar.
10. Operation-specific services keep their existing domain storage:

- Atlas still writes Company Cortex signals and existing Company Cortex dream run data.
- Jaime writes customer-visible proposals and hidden route-outs to `agent_improvement_proposals` through Dream Ops-only tools.

## Tables

- `dream_ops_settings`: per-org scheduler config for one operation and subject.
- `dream_ops_outbox`: internal queue with dedupe, retries, and LISTEN/NOTIFY.
- `dream_ops_runs`: run record with window, status, source counts, chunks, outputs, skip reason, and errors.

## Eligibility

`company_daily_dream` requires at least one Company Cortex source row in the window from messages, channel messages, task activity, deliverables, or conversation documents.

`agent_learning_dream` requires at least one agent signal in the window from skill recommendation events, agent turn feedback, traces, task activity agent rows, or mission logs.

If a run starts but triage removes all evidence, the run is marked `skipped` with `no_meaningful_evidence`.

## Jaime Tool Loop

Jaime dreams run in a dedicated runtime session:

`agent:{gatewayAgentId}:dream_ops:hr:{userId}:{runId}::org:{orgId}`

Only HR `dream_ops` sessions for active `agent_learning_dream` runs can use Dream Ops tools. Normal Jaime chat does not expose them.

Jaime can call:

- `dream_inspect_agent`
- `dream_search_evidence`
- `dream_propose_skill_create`
- `dream_propose_skill_update`
- `dream_propose_skill_resource_update`
- `dream_propose_agent_file_update`
- `dream_route_out`
- `dream_finish`

The final model text is not authoritative. The database rows written by proposal and route-out tools are authoritative. Recommendations are linked back to the run with `agent_improvement_proposals.source_dream_run_id`.

## Decision Log

2026-06-24: Dream Ops became the shared scheduler for Atlas Company Dreams and Jaime Agent Learning Dreams. Atlas keeps Company Cortex product behavior, while Jaime uses existing skill recommendation settings and Home proposal review.

2026-06-24: Jaime Agent Learning Dreams moved from strict JSON output to internal Dream Ops tools. Tool-created proposal rows are now the source of truth.

2026-06-24: Jaime proposal storage was renamed from the legacy skill-recommendation table names to `agent_improvement_candidates`, `agent_improvement_jobs`, and `agent_improvement_proposals`.

2026-07-20: Successful Dream Ops runs now persist their completion timestamp. Company Cortex health reports the last successful company dream, and its status bar uses company-specific Objects, Relationships, Signals, and Last dream vocabulary.
