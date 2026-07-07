# Skill Recommendations / Agent Learning Loops

Last Modified: 2026-06-25

## Overview

Skill recommendations remain the user-facing setting and review surface for Agent Learning Loops. The storage contract is now Agent Improvement Proposals: the system turns repeated agent work into Jaime-reviewed proposals for org-owned skills, skill resource files, and agent files (`ROLE.md`, `IDENTITY.md`, `SOUL.md`). Human thumbs feedback on completed agent turns is stored separately as a learning-loop signal.

Jaime reviews run as scheduled `agent_learning_dream` Dream Ops jobs. Home is only the review surface for customer-visible proposals; it is not the scanner or scheduler.

No change is created automatically by Jaime. Users approve from the Home Suggestions review banner/modal. The backend checkpoints the agent, applies the approved change through guarded agent/skill write paths, starts an experiment, and later evaluates the result as `keep`, `revise`, `revert`, or `inconclusive`.

Platform-owned tool schemas, system agents, official/system skills, memories, workflows, and product bugs are route-outs. Route-outs are stored for internal review but are not customer-visible recommendations.

## Data Flow

1. Workspace admins enable `organizations.settings.skill_recommendations.enabled`.
2. The settings service materializes `dream_ops_settings` rows for `agent_learning_dream` by org agent.
3. `agent-api` records a lightweight `skill_recommendation_events` row after chat completion when the workspace is opted in.
4. Users can vote on completed agent turns from chat, task activity, or mission progress rows. Votes are upserted into `agent_turn_feedback` by `(user_id, target_kind, target_id)`.
5. `DreamOpsNightJanitorService` checks each due Jaime setting and queues a dream only when there is evidence in the window.
6. Jaime dreams collect `skill_recommendation_events`, `agent_turn_feedback`, traces, task activity agent executions, and mission agent logs for that agent.
7. Triage ranks and caps the evidence. If nothing meaningful remains, the shared run is marked `skipped` with `no_meaningful_evidence`.
8. The dream calls Jaime/HR through OpenClaw in a dedicated `dream_ops` session.
9. Jaime inspects evidence/artifacts and creates proposals with internal `dream_*` tools. Final chat text is non-authoritative; tool-created database rows are the source of truth.
10. Recommended proposals are stored in `agent_improvement_proposals` with `source_dream_run_id`, a `proposal_kind`, `target_artifact_kind`, `artifact_lock_key`, `proposed_patch`, priority, quality failures, and customer visibility.
11. Route-out proposals are stored with `customer_visible = false` and status `routed_out`.
12. Customer-visible proposals appear in the Home Suggestions review banner alongside Atlas Company Cortex signals.
13. Applying a proposal creates an agent checkpoint, applies the change, stores an `agent_learning_experiments` row, and marks the proposal `experiment_running`.
14. Evaluating an experiment reads post-change events plus `agent_turn_feedback` guardrails, compares them to the baseline, and marks the proposal `kept`, `revising`, `reverted`, or `inconclusive`. Trusted negative feedback can force revert. Revert restores the checkpoint.

## Backend Layer

- `supabase/migrations/20260605140000_skill_recommendations.sql` creates event, candidate, job, and recommendation tables.
- `supabase/migrations/20260624163000_agent_learning_loop_full_integration.sql` extends recommendations with proposal kinds, route-outs, artifact locks, apply metadata, and `agent_learning_experiments`.
- `supabase/migrations/20260624182000_agent_turn_feedback.sql` creates the human feedback signal table for conversation messages, task activity agent executions, and mission progress logs.
- `supabase/migrations/20260624203000_shared_dream_ops.sql` creates shared Dream Ops settings, runs, and outbox tables for Atlas and Jaime background loops.
- `supabase/migrations/20260624214500_dream_ops_skill_recommendation_link.sql` links tool-created recommendations back to the source Dream Ops run before the table rename.
- `supabase/migrations/20260624173214_rename_agent_improvement_proposal_tables.sql` renames the candidate, job, and proposal storage tables to `agent_improvement_candidates`, `agent_improvement_jobs`, and `agent_improvement_proposals`. `skill_recommendation_events` intentionally remains the repeatable-skill evidence stream.
- `apps/api/src/modules/agent-feedback` validates feedback targets, upserts thumbs/tags/text, and looks up the current user's saved feedback for rendered turns.
- `apps/agent-api/src/modules/chat/services/skill-recommendation-event-recorder.service.ts` records opt-in metadata after completed chat turns.
- `apps/agent-api/src/modules/artifacts/services/artifact-dream-ops.service.ts` implements Jaime's internal `dream_*` tools, validates the active run server-side, patches duplicate artifact proposals, stores hidden route-outs, and writes `dream_finish` output.
- `apps/mission-worker/src/modules/dream-ops` schedules, dispatches, routes, and records shared Dream Ops runs.
- `apps/mission-worker/src/modules/dream-ops/agent-learning-dream-runner.service.ts` collects, triages, runs Jaime, and counts tool-created proposals from `source_dream_run_id`.
- `apps/api/src/modules/skill-recommendations/services/skill-recommendation-detection.service.ts` groups repeated events and creates candidates.
- `apps/api/src/modules/skill-recommendations/services/skill-recommendation-jobs.service.ts` manages the Atlas-style queued lifecycle and hydrates Jaime-only trace evidence.
- `apps/api/src/modules/skill-recommendations/services/skill-recommendation-jaime.service.ts` calls Jaime/HR and validates the proposal contract.
- `apps/api/src/modules/skill-recommendations/services/agent-learning-loop-policy.service.ts` classifies scope, ranks candidates, resolves artifact conflicts, gates proposal quality, and evaluates experiments.
- `apps/api/src/modules/skill-recommendations/services/agent-learning-loop-apply.service.ts` applies approved customer-visible proposals, creates checkpoints, starts experiments, evaluates experiment evidence, and restores checkpoints on revert.
- `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations-legacy-tables.ts` normalizes legacy `skill_recommendations` rows while environments are still waiting for the Agent Improvement table rename migration.
- `apps/api/src/modules/missions/services/agent-checkpoints.service.ts` creates learning-loop checkpoints from the current agent snapshot.
- `apps/api/src/modules/missions/repositories/agent-checkpoints.repository.ts` snapshots definitions, skills, and skill resources.
- `apps/api/src/modules/skill-recommendations/controllers/skill-recommendations.controller.ts` exposes settings, Home, detail, dismiss/convert, apply, and experiment evaluation APIs.

## Frontend Layer

- `apps/web/src/features/settings/components/settings-content/SkillRecommendationsPageContent.tsx` controls the workspace opt-in.
- `apps/web/src/features/home/components/SuggestionReviewBanner.tsx` renders the Home "For you" entry point for Jaime proposals and Atlas Company Cortex signals.
- `apps/web/src/features/home/components/SuggestionReviewModal.tsx` renders the two-pane review shell with a left suggestion list and right-side selected detail.
- `apps/web/src/features/home/components/SuggestionReviewDetails.tsx` renders compact source/status metadata, evidence, recommended action, proposed change, and resources for the selected suggestion.
- `apps/web/src/lib/brain/company-cortex-signals.ts` exposes the shared Company Cortex signal fetch/review client used by Home and Settings.
- `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx` renders shared Copy/Fork/Thumbs actions for completed agent turns and persists tags/text details.
- `apps/web/src/lib/agent-feedback` wraps feedback save/lookup APIs and optimistic state.
- `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`, and `apps/web/src/features/mission-control/components/dialogs/ActivityTimelineLogItem.tsx` attach the shared feedback surface to chat turns, task agent executions, and mission progress rows.
- `apps/web/src/features/skill-recommendations/services/skill-recommendations.service.ts` wraps settings, Home, detail, status, apply, and experiment evaluation API calls.
- Legacy skill-create review through `SkillsPageContent` and `use-skills-create-flow` remains available for existing `recommendationId` flows.

## Decision Log

2026-06-05: Used dedicated skill recommendation tables instead of `brain_import_jobs` so Jaime reviews can mirror Atlas lifecycle without mixing brain-ingestion data with skill proposal data.

2026-06-05: Kept the detector token-free and deterministic. Credits are spent only after opt-in and only when a repeated no-skill pattern crosses the threshold.

2026-06-05: Routed proposal conversion through the existing DB-backed skill creation dialog instead of creating skills automatically, because users must review and edit Jaime’s proposal before persistence.

2026-06-05: Kept full prompt/response data out of `skill_recommendation_events`. Jaime jobs now use `trace_id` to hydrate bounded/redacted evidence from `vb_agent_traces` only at review time.

2026-06-24: Reused the existing skill recommendation pipeline for Agent Learning Loops instead of adding parallel scanner and UI flows. This preserves opt-in settings, event grouping, Jaime queueing, and Home card visibility while adding broader proposal columns.

2026-06-24: Customer-visible proposals are limited to org-owned skills, skill resources, and agent files. Platform/system issues become hidden route-outs so users never see recommendations for official skills or system agents.

2026-06-24: Approved proposals apply through existing guarded mutation paths and create an agent checkpoint first. Experiments use recorded post-change events and policy thresholds to decide keep, revise, revert, or inconclusive.

2026-06-24: Human feedback is a first-class signal in `agent_turn_feedback`, not a candidate source. Jaime can see aggregated feedback during review, and experiment evaluation uses negative/trusted negative feedback as a guardrail.

2026-06-24: Jaime Agent Learning Loops moved onto shared Dream Ops. The existing Home proposal UI remains, but scheduled review is driven by `dream_ops_settings`, evidence-gated `dream_ops_outbox` rows, and persisted `dream_ops_runs`.

2026-06-24: Jaime dreams switched from strict JSON output to a dedicated Dream Ops tool loop. Proposal tools create or patch `agent_improvement_proposals` rows directly, route-outs stay hidden, and the runner counts proposals by `source_dream_run_id`.

2026-06-24: The misleading physical storage names were removed. Candidate, job, and proposal tables are now `agent_improvement_candidates`, `agent_improvement_jobs`, and `agent_improvement_proposals`; only `skill_recommendation_events` keeps the old name because it describes the skill-specific evidence source.

2026-06-24: Home Agent Improvements moved from inline action buttons to a proper review modal so users can inspect Jaime's evidence, target, proposed change, and resources before applying or dismissing a suggestion.

2026-06-24: Home Agent Improvements gained a legacy storage fallback during the proposal-table rename rollout. If `agent_improvement_proposals` is not present yet, the Home endpoint reads `skill_recommendations`, normalizes the rows to the proposal shape, and the card shows a real load error instead of incorrectly saying learning loops are off when loading fails.

2026-06-25: Jaime suggestions moved out of the Home card grid into the Home "For you" suggestion banner. The banner groups Jaime Agent Improvement proposals and Atlas Company Cortex signals into one Review modal with a left-side suggestion list, status labels, and a compact right-side detail pane.

2026-06-25: Repository reads/writes now centralize the canonical Agent Improvement table names, and queued job dedupe accepts both the renamed and legacy unique constraint names during rollout.
