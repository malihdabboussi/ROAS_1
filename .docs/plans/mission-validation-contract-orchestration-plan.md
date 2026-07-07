# Mission Validation Contract Orchestration Plan

**Date:** 2026-06-07
**Status:** Architecture analysis and implementation plan
**Source video:** https://youtu.be/ow1we5PzK-o?si=zq4a9sdZyPEZSoTO
**Additional videos reviewed:** https://youtu.be/UQKg0td-Bf4?si=gQs1DRvNL8PINemp, https://youtu.be/C_GG5g38vLU?si=wDbpq51S5QyfMoIk, https://youtu.be/mR-WAvEPRwE?si=1xy8CQ8FsFMl90YD, https://youtu.be/am_oeAoUhew?si=H0nuaUCbCRJCSqrj
**Transcript source:** YouTube captions fetched locally with `youtube-transcript-api-js` into `/private/tmp/*-transcript.txt`.

---

## 1. Architect TLDR

**TLDR:** The current mission system is already a strong execution harness: it has outbox dispatch, planning, plan approval, subtasks, dependency execution, artifact output contracts, preflight checks, correction loops, review, quality evaluation, triage, comments-as-directives, campaign context, brain context, and live UI. What it does not yet have is a first-class validation-first intake layer: context research, explicit unknowns, clarification questions, mission-level assertions, assertion-to-subtask coverage, and validator evidence all created before execution.

The best next architecture is not a rewrite. It is an additive Mission Spec V2 layer that sits between mission creation and planning:

1. **Research:** Build a persistent context snapshot from campaign context, theme, offers, avatars, recent deliverables, space retrieval, user brain, agent brain, company brain, customer brain, integrations, MCP availability, files, and prior mission state.
2. **Clarify:** Convert weak or missing evidence into explicit user questions, assumptions, and "can proceed without answer" decisions.
3. **Contract:** Generate a mission-level assertion contract before planning. Assertions define what must be true at the end, how it will be verified, which evidence is required, and which validator owns it.
4. **Plan:** Create subtasks only after the assertion contract exists. Every assertion must be covered by at least one subtask, validator, or explicit out-of-scope decision.
5. **Execute:** Keep the current subtask worker model and artifact output contracts. Add assertion context to each worker prompt.
6. **Validate:** Add validator runs that verify assertions with fresh context. Use at least three validator modes: scrutiny, user-testing, and marketing-quality.
7. **Repair:** Failed assertions create targeted follow-up subtasks or a full replan. The repair loop is driven by failed assertion IDs, not vague feedback.

This system matches the video lesson: deterministic code should own state, gates, retries, dedupe, coverage checks, and evidence persistence. Agent prompts and skills should own judgment, planning, implementation, and review. The current codebase is already shaped for this because mission execution is outbox-driven and phase-based.

The key product decision: **make the "plan approval" screen become "spec approval."** The user should approve not only the task list, but also the context used, unanswered questions, assumptions, assertions, and validator plan. For simple missions this can collapse into one lightweight screen; for full marketing workflows it becomes the main quality lever.

Addendum after reviewing the extra harness/validation sources: the first production slice should treat the mission as a generated harness, not only as a generated plan. The harness is the deterministic wrapper around the agents: context source selection, permissions, phase gates, max attempts, trace persistence, output contracts, validator rubrics, and repair criteria. Better prompts are useful, but the system gets reliable when the harness can prove when the model lied, drifted, skipped evidence, or passed work that only looked done.

The skill guidance adds one more constraint: any new mission skills should be database-first in `agent_skills`, not filesystem-only, and the skill bodies should use progressive disclosure. Put concise triggers and workflows in the skill body, move heavy rubrics and assertion packs into resources, and explain why each rule exists so workers and validators can generalize instead of cargo-culting a rigid checklist.

---

## 2. Video Analysis

**TLDR:** The video describes a production multi-agent mission system where planning starts by defining correctness. The central mechanism is a validation contract created before work begins, then used by workers and independent validators to drive implementation, review, and repair.

### 2.1 Core Thesis

The video's core claim is that the bottleneck is human attention, not model intelligence. Long-running multi-agent systems work when humans move out of the step-by-step execution path and into architecture, product, and final decision-making.

The practical implication for Vibey: a user should not have to re-explain every campaign constraint, brand rule, avatar pain point, offer angle, funnel section, or anti-pattern every time. The system should research available context first, surface uncertainty, and turn the final approved mission into a contract workers and validators can follow.

### 2.2 Multi-Agent Patterns From The Video

The video names five multi-agent patterns:

1. **Delegation:** An orchestrator decomposes a mission and assigns work to specialist workers.
2. **Creator-verifier:** A creator produces work, then a verifier checks it independently.
3. **Direct communication:** Agents share handoffs and context through structured messages.
4. **Negotiation:** Agents can push back, ask for changes, or route around blockers.
5. **Broadcast:** Mission progress, handoffs, and findings are visible to the user and system.

Vibey already has pieces of all five:

- Delegation exists through mission plan subtasks and `assignTo`.
- Creator-verifier exists through execute then review and quality evaluation.
- Direct communication exists through dependency outputs, logs, execution state, and comments.
- Negotiation exists through triage, reassign, retry, replace, and replan.
- Broadcast exists through Mission Control UI, logs, notifications, realtime updates, and execution streaming.

The missing part is a mission-level contract that binds those pieces together before planning.

### 2.3 Orchestrator Role

The video's orchestrator does not jump straight into a task list. It scopes through conversation, asks strategic questions, identifies unclear requirements, and produces a plan with features, milestones, and a validation contract.

Current Vibey behavior differs in an important way:

- `MissionPlanPhaseService` moves a mission from `inbox` or `planning` directly into planning.
- `MissionOpenclawGateway.callOpenClawForPlan` tells the manager to make smart creative decisions, block rarely, and plan subtasks.
- There is no persisted pre-plan research artifact, question queue, assertion contract, or coverage gate.

### 2.4 Validation Contract

The video treats the validation contract like TDD moved one step earlier. Before implementation, the system writes what must be true at the end. The contract is independent of implementation choices.

For Vibey, this should become:

- **Mission assertions:** user/business/brand/workflow outcomes that must be true.
- **Artifact contracts:** concrete durable outputs required from specific subtasks. This already exists as `mission_subtasks.output_contract`.
- **Validator recipes:** how each assertion will be verified, by which validator, using which evidence.
- **Coverage map:** which subtask or validator covers each assertion.

Current Vibey has artifact output contracts, but not mission assertions.

### 2.5 Worker Role

The video workers receive clean scoped context, implement an assigned feature, and provide structured handoff: what was completed, what is left, commands run or evidence produced, issues found, and compliance notes.

Current Vibey workers already receive:

- Campaign context.
- Guaranteed subtask context.
- Dependency outputs.
- Output contracts.
- Completed action checkpoint context.
- Latest user comments.
- Agent identity and runtime session keys.

The gap is that workers do not receive assertion IDs and evidence requirements. They know the subtask intent, but not the full "what must be true" contract.

### 2.6 Validator Role

The video separates validators from workers. Validators have fresh context and adversarial posture. It describes two validator classes:

- **Scrutiny validator:** tests, typecheck, lint, code review, artifact checks.
- **User-testing validator:** launches the app/product, interacts like a user, fills forms, clicks through flows, checks holistic quality.

Current Vibey has:

- Manager review.
- Independent quality evaluation.
- Artifact output contract verification.
- Triage after failure.

Current Vibey does not yet have:

- A validator run table.
- Validator roles as first-class execution phases.
- Assertion-by-assertion evidence.
- User-testing validators for marketing funnels or live app flows.

### 2.7 Serial vs Parallel Execution

The video found that full parallel worker execution causes conflicts, especially when multiple agents can modify the same codebase or artifact family. They moved toward serial feature execution while parallelizing read-only work and independent validators.

Current Vibey allows independent subtasks with no dependencies to execute in parallel through outbox dispatch. For marketing deliverables this may be acceptable when outputs are separate, but full campaign workflows need stricter milestone gating:

- Parallelize context retrieval and independent validators.
- Keep artifact-creating subtasks serial inside a milestone when they affect the same funnel/email/website.
- Let dependent subtasks enforce ordering through `depends_on`.

### 2.8 Mission Control UI

The video emphasizes a mission control surface that shows progress, budget, current worker, handoffs, validator findings, and course corrections.

Current Vibey already has:

- Mission list/kanban.
- Mission detail modal.
- Subtask progress.
- Activity timeline.
- Plan approval.
- Realtime execution streaming.
- Deliverable carousel.

The missing UI concepts are:

- Context snapshot.
- Clarification queue.
- Assumption approval.
- Assertion contract approval.
- Assertion coverage matrix.
- Validator run evidence.
- Failed assertion repair path.

### 2.9 "Bitter Lesson" From The Video

The video says most orchestration intelligence is prompt/skill text, while deterministic code is thin bookkeeping, validation, and gates.

This aligns with the current Vibey codebase. The right direction is to add deterministic state and enforcement, then update planner/worker/validator skills. Avoid creating a heavy new orchestration framework.

### 2.10 Additional Video Findings

**TLDR:** The extra videos sharpen the plan from "validation contract" into "mission harness." The harness should generate and store the right context at the right time, negotiate done criteria before execution, run independent critics with fresh context, use deterministic checks to catch false success, and write traces so the system can improve from observed failure patterns.

#### Spec-Driven Validation

The Safe Intelligence talk adds the clearest validation model: define an agent's task independently of the implementation. A useful spec includes more than examples. It includes rules, domain vocabulary, role/permission boundaries, task context, robustness requirements, and valid perturbations.

Mission Harness implication:

- Mission assertions should distinguish examples from rules, ontology, permissions, context, and robustness.
- Marketing missions need robustness checks such as "copy still works when the avatar is rephrased," "CTA remains clear on mobile," and "the offer is not contradicted across landing page, email, and posts."
- Security and permission limits belong in the same spec because tool power is part of what makes an agent safe or unsafe.
- Validation should remain independent of the worker implementation so the same assertion contract can survive model, agent, or harness changes.

#### Agent Harness Reliability

The AI harness talk shows a useful principle: the outcome can change without changing the prompt if the harness adds deterministic guardrails and verification. The example fails correctly only after the harness inspects tool history and browser state instead of trusting the model's self-report.

Mission Harness implication:

- Do not trust "done" from a worker. Verify against contracts and evidence.
- Keep deterministic phase gates: max attempts, required evidence, required validators, status transitions, and failure reasons.
- Put sensitive actions such as authentication, account selection, and integration setup in harness-level code or approved tools, not free-form worker instructions.
- Every mission should have a trace that can prove why the harness accepted or rejected a result.

#### Long-Running Agent Harnesses

The long-running agent talk reinforces five patterns: persistent artifacts, fresh or intentionally compacted context, one feature at a time when needed, browser/user testing, and adversarial evaluator roles.

Mission Harness implication:

- Store mission state as durable JSON/rows, not only in the model context.
- Use structured handoffs instead of relying on conversation history.
- Give validators output plus the contract, not the worker's private reasoning.
- Let a validator reject vague criteria. Granular criteria produce actionable repairs.
- Keep the planner high-level enough to avoid cascading bad technical decisions; use worker-validator negotiation to refine done criteria at the feature/subtask level.

#### Harness Engineering And Context Engineering

The harness engineering keynote/Q&A adds an operating model: scarce resources are human time, human/model attention, and context. Good harnesses surface the right instructions just in time and turn repeated failures into durable docs, skills, lints, tests, or validators.

Mission Harness implication:

- Context research should be progressive, not a giant prompt blob. Load stable campaign facts first, then retrieve specialized facts per assertion/subtask/validator.
- Repeated quality failures should become assertion packs, validator rubrics, or database skills after review.
- "Every time the user must type continue" is a harness failure unless the stop is an intentional approval gate.
- Mission Control should show traces, validator findings, and repair history so the architect can debug the harness, not just the deliverable.

#### Skill And Prompt Guidance

The `claude-skills` and `context-eng` guidance adds local implementation rules:

- Skills are database-first through `agent_skills` and `agent_skill_resources`; filesystem copies are runtime artifacts.
- Skill descriptions must trigger on the right mission/workflow language.
- Skill bodies should stay lean and use references/resources for large rubrics.
- Instructions should explain why rules exist, avoid brittle overfitting, use consistent terms, and provide concrete examples.
- Mission skills should be fewer and stronger rather than a large set of narrow overlapping skills.

---

## 3. Current Vibey Mission System

**TLDR:** Vibey already has a robust Mission Runner V2 foundation. Missions are created through the API, queued through `mission_outbox`, planned by a manager through OpenClaw, persisted as a plan plus subtasks, approved by the user, executed by workers, checked against subtask output contracts, reviewed by the manager, independently quality-evaluated, and repaired through triage/comment directives.

### 3.1 Current Flow

Current mission lifecycle:

```text
User creates mission
  -> API creates missions row with status inbox
  -> API writes mission.plan.requested to mission_outbox
  -> worker dispatcher maps outbox event to BullMQ plan job
  -> MissionPlanPhaseService calls OpenClaw planner
  -> internal API persists missions_plans and mission_subtasks
  -> mission becomes pending_approval or todo
  -> user approves plan or auto-approve fires
  -> root subtasks enqueue mission.subtask.execute.requested
  -> MissionExecutePhaseService runs worker per subtask
  -> output_contract preflight and verification run
  -> completed subtasks roll mission into review
  -> MissionReviewPhaseService reviews subtasks
  -> independent quality eval can send work back
  -> mission becomes done, todo, blocked, or planning
```

### 3.2 API Layer Evidence

Key files:

- `apps/api/src/modules/missions/controllers/missions.controller.ts`
- `apps/api/src/modules/missions/controllers/internal-missions.controller.ts`
- `apps/api/src/modules/missions/services/mission-lifecycle.service.ts`
- `apps/api/src/modules/missions/services/mission-internal.service.ts`
- `apps/api/src/modules/missions/services/missions-plan-decision.service.ts`
- `apps/api/src/modules/missions/services/mission-outbox.service.ts`
- `apps/api/src/modules/missions/dto/index.ts`
- `apps/api/src/modules/missions/repositories/missions.repository.ts`
- `apps/api/src/modules/missions/missions.module.ts`

What exists:

- Public mission CRUD and status endpoints.
- Mission creation with idempotency and outbox event.
- Comment directives that enqueue `mission.comment.directive`.
- Plan approval and rejection.
- Subtask listing and updates.
- Human subtasks.
- Deliverables.
- Notifications.
- Space visibility and permission checks.
- Internal manager routes for append, cancel, edit, retry, and replan.

Important current behavior:

- `MissionLifecycleService.create` creates the mission and enqueues `mission.plan.requested`.
- `MissionInternalService.internalCreatePlan` persists `missions_plans` and `mission_subtasks`.
- `MissionsPlanDecisionService.approvePlan` activates subtasks and handles recommended hires.
- `MissionInternalService.managerPrepareReplan` cancels incomplete subtasks and re-enqueues planning.
- `MissionInternalService.managerAppendSubtasks` can add new subtasks after review or comments.

### 3.3 Worker Layer Evidence

Key files:

- `apps/mission-worker/src/modules/missions/processors/missions.processor.ts`
- `apps/mission-worker/src/modules/missions/services/missions.service.ts`
- `apps/mission-worker/src/modules/missions/services/missions.outbox-dispatcher.service.ts`
- `apps/mission-worker/src/modules/missions/services/phases/mission-plan-phase.service.ts`
- `apps/mission-worker/src/modules/missions/services/phases/mission-execute-phase.service.ts`
- `apps/mission-worker/src/modules/missions/services/phases/mission-review-phase.service.ts`
- `apps/mission-worker/src/modules/missions/services/phases/mission-subtask-triage.service.ts`
- `apps/mission-worker/src/modules/missions/services/phases/mission-comment-directive.service.ts`
- `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`
- `apps/mission-worker/src/modules/missions/services/context/mission-context.service.ts`
- `apps/mission-worker/src/modules/missions/services/persistence/mission-state.repository.ts`
- `apps/mission-worker/src/modules/missions/services/persistence/mission-deliverables.repository.ts`
- `apps/mission-worker/src/modules/missions/types/missions.types.ts`

What exists:

- Phase router: `plan`, `execute`, `review`, `triage`, `directive`.
- Outbox dispatcher with dedupe, retry, circuit breaker, priority, LISTEN/NOTIFY, reconcile sweep, and Supabase fallback.
- Plan phase that sets mission status, calls OpenClaw planner, stores plan via internal API, and logs progress.
- Execute phase that claims a subtask, builds subtask prompt, streams execution, tracks tools, verifies output contracts, persists output, and enqueues next work.
- Review phase that checks all subtasks are done, blocks unverified contracts, runs manager review, validates review payload shape, applies scope changes, optionally runs independent quality evaluation, and marks mission done or sends subtasks back.
- Triage phase that decides retry, reassign, cancel, replace, replan, or escalate.
- Directive phase that interprets user comments into manager actions.

### 3.4 Context Layer Evidence

Current mission context sources:

- Campaign `context`, `resources`, `current_priorities`, `config`.
- Offers.
- Avatars.
- Recent mission deliverables.
- Theme voice and brand data.
- Campaign agent memory.
- Campaign graph context through embedding and graph traversal.
- Mission attachments.
- Agent identity.
- Agent level and runtime identity.
- Agent API mission context enrichment with theme, user brain, agent brain, company brain, customer brain, integrations, MCP availability, and pulse context.
- Space retrieval with semantic, lexical, rerank, graph expansion, sufficiency, missing fields, and suggested next queries.

Key files:

- `apps/mission-worker/src/modules/missions/services/context/mission-context.service.ts`
- `apps/agent-api/src/modules/artifacts/services/mission-context-enricher.service.ts`
- `apps/agent-api/src/modules/brain/services/brain-context.service.ts`
- `apps/agent-api/src/modules/chat/services/campaign-context.service.ts`
- `apps/agent-api/src/modules/spaces-retrieval/services/space-retrieval.service.ts`
- `apps/agent-api/src/modules/spaces-retrieval/services/space-retrieval-relevance.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-context-response.service.ts`

Important finding:

The context systems already know how to report insufficient context and weak/shared context. The mission system does not yet turn those signals into a persisted pre-plan clarification workflow.

### 3.5 UI Layer Evidence

Key files:

- `apps/web/src/features/mission-control/containers/MissionControlContainer.tsx`
- `apps/web/src/features/mission-control/components/MissionQuickCapture.tsx`
- `apps/web/src/features/mission-control/components/MissionPlanView.tsx`
- `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.tsx`
- `apps/web/src/features/mission-control/components/dialogs/SubtasksSection.tsx`
- `apps/web/src/features/mission-control/components/dialogs/PlanDetailModal.tsx`
- `apps/web/src/features/mission-control/hooks/useMissionDetailData.ts`
- `apps/web/src/features/mission-control/hooks/useMissionExecStream.ts`
- `apps/web/src/features/mission-control/services/missions.service.ts`
- `apps/web/src/features/mission-control/types/index.ts`

What exists:

- Quick mission capture with title/brief, campaign, priority, attachments, voice input, and capability warning.
- Mission dashboard with list/kanban, filters, sorting, selected mission.
- Mission detail modal with live mission data, logs, plan, subtasks, deliverables, comments, attachments, rating, and plan approval.
- Task overview modal with execution plan, subtasks, intent, agent notes, feedback, recommended hires, approve/reject.
- Realtime detail updates for missions, logs, deliverables, subtasks, plans, and agents.
- Live execution stream from Supabase broadcast.

What is missing:

- UI for context snapshot.
- UI for clarification questions.
- UI for assumptions.
- UI for assertion contract approval.
- UI for assertion-to-subtask coverage.
- UI for validator evidence.
- UI for failed assertion repair.

### 3.6 Database Layer Evidence

Key migrations:

- `supabase/migrations/20260221165157_030_missions_mvp.sql`
- `supabase/migrations/20260221172413_031_missions_unified_phase1.sql`
- `supabase/migrations/20260221182243_mission_deliverables.sql`
- `supabase/migrations/20260227010000_mission_subtasks.sql`
- `supabase/migrations/20260227200000_add_intent_to_mission_subtasks.sql`
- `supabase/migrations/20260228210000_mission_outbox.sql`
- `supabase/migrations/20260303101000_mission_subtasks_execution_state.sql`
- `supabase/migrations/20260521145500_mission_subtask_output_contracts.sql`
- `supabase/migrations/20260525101000_mission_space_visibility_sharing.sql`

Current core tables:

- `missions`
- `missions_logs`
- `missions_plans`
- `mission_subtasks`
- `mission_deliverables`
- `mission_outbox`
- `mission_shares`
- `agents_registry`
- `agent_skills`
- `campaign_agents`

Current subtask contract fields:

- `mission_subtasks.output_contract`
- `mission_subtasks.contract_status`
- `mission_subtasks.contract_verification`
- `mission_subtasks.preflight_attempts`
- `mission_subtasks.correction_attempts`

Missing mission spec fields/tables:

- Context snapshots.
- Clarification questions.
- Mission assertions.
- Assertion coverage.
- Validator runs.
- Assertion evidence.

---

## 4. Root Diagnosis

**TLDR:** The current system is execution-first. It plans immediately, validates artifacts after execution, and uses review/triage to repair. The proposed system should be validation-first: research and assertions shape the plan before work starts, then validators prove each assertion after work completes.

### 4.1 Five Whys

Symptom: Missions can produce work that is structurally complete but not deeply aligned to campaign strategy, avatar pain, conversion goals, or user expectations.

Why 1: The planner creates subtasks from the mission brief and available context without first producing a mission-level correctness contract.

Why 2: Current validation is mostly subtask-local: output contract, subtask intent, manager review, quality eval.

Why 3: The mission plan schema stores title, summary, approach, out-of-scope, subtasks, intent, and output contracts, but not assertions, evidence requirements, validator recipes, or coverage.

Why 4: The UI asks the user to approve the task overview, not the context, assumptions, assertions, or validation strategy.

Why 5: The system evolved from a simple mission queue into a robust execution runner, but the validation-first spec layer was never added.

Root cause: **Correctness is not a first-class object before planning.**

### 4.2 Right Fix vs Quick Fix

Quick fix to avoid:

- Add more instructions to the planner prompt saying "make it high quality."
- Add more generic review criteria.
- Ask workers to "be specific" without deterministic coverage.
- Add a single `acceptanceCriteria` array inside `missions_plans.content` and stop there.

Right fix:

- Add a persisted Mission Spec V2 model.
- Generate and approve assertions before planning.
- Enforce assertion coverage before plan approval.
- Store validator runs and evidence.
- Let failed assertions drive repair subtasks.

Why this is the right fix:

- It makes the target state inspectable.
- It gives workers clear context without re-explaining everything.
- It gives validators an independent checklist.
- It gives the user an architecture-level approval surface.
- It prevents vague "quality" feedback from becoming the only repair signal.

---

## 5. Target Architecture: Mission Spec V2

**TLDR:** Add a Mission Spec V2 layer between mission creation and plan generation. It should persist what the system found, what it does not know, what the user clarified, what must be true, how each assertion will be validated, and how subtasks cover the assertions.

### 5.1 New Lifecycle

Recommended lifecycle:

```text
inbox
  -> research
  -> clarification_pending, if needed
  -> contract_pending
  -> plan
  -> pending_approval
  -> todo
  -> in_progress
  -> validation
  -> done
```

Implementation note: status strings can be introduced either as new `missions.status` values or represented as `planning` with `mission_spec.status`. The safer first implementation is to keep `missions.status = planning` during research/clarification/contract and track exact state in new spec tables. Add status strings later if the product needs board-level columns.

### 5.2 New Outbox Events

Add these event types:

- `mission.research.requested`
- `mission.clarification.requested`
- `mission.contract.requested`
- `mission.validation.requested`
- `mission.repair.requested`

Each maps to the same BullMQ mission queue, using the existing dispatcher pattern.

### 5.3 New Worker Phases

Extend `MissionJobData.phase` from:

```ts
'plan' | 'execute' | 'review' | 'triage' | 'directive'
```

to:

```ts
'research' | 'clarify' | 'contract' | 'plan' | 'execute' | 'review' | 'validate' | 'repair' | 'triage' | 'directive'
```

Alternative for a smaller first release:

- Keep external phase as `plan`.
- Split `MissionPlanPhaseService.process` internally into `research -> clarify -> contract -> plan`.
- Add new persistence and UI first.
- Add explicit outbox phases in phase 2.

I recommend explicit phases because it makes retries, metrics, stuck-state recovery, and UI progress clearer.

### 5.4 Harness Run Artifacts

**TLDR:** Treat each mission as a generated harness run with durable artifacts that survive compaction, retries, and model swaps.

Recommended artifacts:

- `context_snapshot`: what the system found and how confident it is.
- `clarification_set`: required questions, optional questions, assumptions, and answers.
- `assertion_contract`: mission-level correctness criteria.
- `coverage_map`: which subtasks implement and which validators verify each assertion.
- `handoff_log`: worker-completed, left-undone, tools used, evidence produced, and risk notes.
- `validation_runs`: validator scores, failed assertions, evidence, and recommended repairs.
- `trace_digest`: summarized but source-linked trace of why the harness accepted/rejected work.

This mirrors the long-running harness pattern where JSON and other persistent artifacts become the shared state. It also fits Vibey better than file-only state because missions are already database-backed and realtime-driven.

### 5.5 Generator-Validator Negotiation

**TLDR:** Before a worker starts, the assigned worker and validator should agree on what done means for that subtask. The mission assertion contract remains the outer boundary; the negotiated subtask contract becomes the actionable local checklist.

Add a subtask-level negotiation step for high-impact subtasks:

1. Planner assigns assertions to the subtask.
2. Worker proposes implementation evidence and verification steps.
3. Validator pushes back on weak tests, vague evidence, or missing edge cases.
4. Harness persists the final agreed subtask validation contract.
5. Worker executes.
6. Validator grades against the agreed contract and mission assertions.

Use this only where it matters. Simple subtasks can use direct `output_contract` plus mission assertions.

---

## 6. Data Model

**TLDR:** Keep `mission_subtasks.output_contract` for durable artifact checks. Add new mission-level tables for context snapshots, clarification questions, assertions, assertion coverage, validation runs, and evidence.

### 6.1 Mission Context Snapshots

Purpose: Persist what the system found before planning so user, planner, workers, and validators share a grounded source.

Suggested table: `mission_context_snapshots`

```sql
id uuid primary key default gen_random_uuid()
mission_id uuid not null references missions(id) on delete cascade
user_id uuid not null references auth.users(id) on delete cascade
org_id uuid references organizations(id)
snapshot_kind text not null check (snapshot_kind in ('research', 'replan', 'validation'))
query text not null
context_summary jsonb not null default '{}'::jsonb
sources jsonb not null default '[]'::jsonb
missing jsonb not null default '[]'::jsonb
sufficiency jsonb not null default '{}'::jsonb
created_by_agent_key text
created_at timestamptz not null default now()
```

Recommended source object:

```json
{
  "source_type": "campaign_context|offer|avatar|theme|space|user_brain|agent_brain|company_brain|customer_brain|integration|attachment|deliverable",
  "source_id": "uuid-or-stable-id",
  "title": "source title",
  "confidence": "strong|medium|weak",
  "summary": "short grounded fact",
  "evidence_ref": {"table": "space_semantic_chunks", "id": "uuid"}
}
```

### 6.2 Clarification Questions

Purpose: Turn missing or weak context into a user-visible decision queue.

Suggested table: `mission_clarification_questions`

```sql
id uuid primary key default gen_random_uuid()
mission_id uuid not null references missions(id) on delete cascade
user_id uuid not null references auth.users(id) on delete cascade
org_id uuid references organizations(id)
question_key text not null
question text not null
rationale text not null
impact text not null
answer_type text not null check (answer_type in ('free_text', 'single_choice', 'multi_choice', 'confirm_assumption'))
options jsonb not null default '[]'::jsonb
assumption text
required boolean not null default false
status text not null default 'pending' check (status in ('pending', 'answered', 'skipped', 'assumed'))
answer jsonb
created_at timestamptz not null default now()
answered_at timestamptz
unique (mission_id, question_key)
```

Question policy:

- Ask only questions that change the plan or validation contract.
- Separate required questions from optional quality-improving questions.
- Let the user approve assumptions instead of typing when the system has enough confidence.
- Do not block simple missions unless missing context makes validation impossible.

### 6.3 Mission Assertions

Purpose: Define what must be true by the end.

Suggested table: `mission_assertions`

```sql
id uuid primary key default gen_random_uuid()
mission_id uuid not null references missions(id) on delete cascade
user_id uuid not null references auth.users(id) on delete cascade
org_id uuid references organizations(id)
assertion_key text not null
category text not null
statement text not null
priority text not null default 'must' check (priority in ('must', 'should', 'could'))
source_refs jsonb not null default '[]'::jsonb
validator_type text not null check (validator_type in ('deterministic', 'scrutiny', 'user_testing', 'marketing_quality', 'data_integrity', 'human_review'))
evidence_requirement text not null
status text not null default 'pending' check (status in ('pending', 'covered', 'validated', 'failed', 'waived'))
failure_severity text not null default 'major' check (failure_severity in ('blocker', 'major', 'minor'))
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
unique (mission_id, assertion_key)
```

Example assertions for a landing page plus emails mission:

```json
[
  {
    "assertion_key": "A-001",
    "category": "avatar",
    "statement": "The page and emails speak to the selected avatar's named pain points, not generic business pain.",
    "validator_type": "marketing_quality",
    "evidence_requirement": "Validator cites at least 3 specific copy passages and maps each to a known avatar pain point."
  },
  {
    "assertion_key": "A-002",
    "category": "funnel",
    "statement": "The landing page includes hero promise, problem agitation, mechanism, proof, offer, FAQ, and CTA sections.",
    "validator_type": "scrutiny",
    "evidence_requirement": "Validator enumerates each required section and confirms it exists in the created funnel/page artifact."
  },
  {
    "assertion_key": "A-003",
    "category": "integration",
    "statement": "The form is embedded and routes submissions to the requested destination.",
    "validator_type": "user_testing",
    "evidence_requirement": "Validator submits a test lead and records resulting confirmation, network response, or CRM record."
  }
]
```

### 6.4 Assertion Coverage

Purpose: Prove every assertion is handled by the plan.

Suggested table: `mission_assertion_coverage`

```sql
id uuid primary key default gen_random_uuid()
mission_id uuid not null references missions(id) on delete cascade
assertion_id uuid not null references mission_assertions(id) on delete cascade
subtask_id uuid references mission_subtasks(id) on delete cascade
validator_run_id uuid
coverage_type text not null check (coverage_type in ('implemented_by', 'verified_by', 'waived_by'))
rationale text not null
created_at timestamptz not null default now()
unique (assertion_id, subtask_id, coverage_type)
```

Gate:

- A mission cannot move to `pending_approval` unless all `must` assertions have at least one `implemented_by` and one `verified_by` coverage entry.

### 6.5 Validation Runs

Purpose: Store validator execution and evidence.

Suggested table: `mission_validation_runs`

```sql
id uuid primary key default gen_random_uuid()
mission_id uuid not null references missions(id) on delete cascade
user_id uuid not null references auth.users(id) on delete cascade
org_id uuid references organizations(id)
validator_type text not null
validator_agent_key text not null
status text not null default 'pending' check (status in ('pending', 'running', 'passed', 'failed', 'blocked'))
assertion_ids uuid[] not null default '{}'
input_snapshot_id uuid references mission_context_snapshots(id)
result jsonb not null default '{}'::jsonb
started_at timestamptz
completed_at timestamptz
created_at timestamptz not null default now()
```

Result payload:

```json
{
  "summary": "short result",
  "assertion_results": [
    {
      "assertion_key": "A-001",
      "passed": true,
      "evidence": "specific cited evidence",
      "evidence_refs": [{"deliverable_id": "uuid", "path": "hero.copy"}]
    }
  ],
  "failed_assertions": [],
  "recommended_repairs": []
}
```

### 6.6 Assertion Evidence

Purpose: Make evidence queryable and displayable.

Suggested table: `mission_assertion_evidence`

```sql
id uuid primary key default gen_random_uuid()
mission_id uuid not null references missions(id) on delete cascade
assertion_id uuid not null references mission_assertions(id) on delete cascade
validation_run_id uuid references mission_validation_runs(id) on delete set null
evidence_type text not null check (evidence_type in ('deliverable', 'tool_trace', 'log', 'screenshot', 'database_row', 'external_url', 'human_answer'))
evidence_ref jsonb not null default '{}'::jsonb
summary text not null
created_at timestamptz not null default now()
```

---

## 7. Prompt And Skill Changes

**TLDR:** Prompt changes should be structured around new artifacts, not more generic quality language. Planner creates assertions and coverage. Workers execute against relevant assertions. Validators independently verify assertion evidence. Repair agents act only on failed assertion IDs.

### 7.1 Research Prompt

New prompt mode: `MISSION_RESEARCH`.

Inputs:

- Mission title, brief, description, input attachments.
- Campaign ID, space ID, source item ID.
- Available context source inventory.
- Latest user comments.
- Existing mission state for replans.

Output:

```json
{
  "kind": "context_snapshot",
  "query": "research query used",
  "context_summary": {
    "campaign": [],
    "avatar": [],
    "offer": [],
    "brand": [],
    "space": [],
    "user_brain": [],
    "company_brain": [],
    "customer_brain": [],
    "integrations": [],
    "attachments": []
  },
  "sources": [],
  "missing": [],
  "sufficiency": {
    "sufficient_for_plan": true,
    "sufficient_for_validation": false,
    "reason": "..."
  },
  "suggested_questions": []
}
```

Planner posture change:

- Current planner says to make smart creative decisions and block rarely.
- Research should instead identify what it knows, what it infers, and what would be risky to infer.

### 7.2 Clarification Prompt

New prompt mode: `MISSION_CLARIFICATION`.

Goal: produce the smallest question set needed to build a strong assertion contract.

Output:

```json
{
  "kind": "clarifications",
  "questions": [
    {
      "question_key": "Q-001",
      "question": "Which avatar should this funnel prioritize?",
      "rationale": "Multiple avatars exist and copy direction changes by avatar.",
      "impact": "Controls offer framing, objections, proof, and CTA language.",
      "answer_type": "single_choice",
      "options": ["Founders", "Agency owners", "Course creators"],
      "required": true
    }
  ],
  "assumptions": [
    {
      "question_key": "A-Q-001",
      "assumption": "Use the most recently updated offer as the primary offer.",
      "confidence": "medium",
      "can_proceed_without_answer": true
    }
  ]
}
```

### 7.3 Assertion Contract Prompt

New prompt mode: `MISSION_CONTRACT`.

Goal: generate the mission-level acceptance contract.

Output:

```json
{
  "kind": "assertion_contract",
  "mission_goal": "one paragraph",
  "assertions": [
    {
      "assertion_key": "A-001",
      "category": "strategy|avatar|offer|copy|design|workflow|integration|analytics|compliance|deliverable",
      "statement": "what must be true",
      "priority": "must|should|could",
      "source_refs": [],
      "validator_type": "deterministic|scrutiny|user_testing|marketing_quality|data_integrity|human_review",
      "evidence_requirement": "how to prove it",
      "failure_severity": "blocker|major|minor"
    }
  ],
  "out_of_scope": [],
  "risks": []
}
```

### 7.4 Planner Prompt

Modify `MissionOpenclawGateway.callOpenClawForPlan`.

Add:

- The approved context snapshot.
- Clarification answers and assumptions.
- The assertion contract.
- Requirement that every subtask lists `assertionKeys`.
- Requirement that validator plan covers every `must` assertion.

Planner output should become:

```json
{
  "kind": "plan",
  "title": "...",
  "summary": "...",
  "approach": "...",
  "assertionCoverage": [
    {
      "assertionKey": "A-001",
      "implementedBy": ["st-1", "st-2"],
      "verifiedBy": ["marketing-quality-validator"],
      "rationale": "..."
    }
  ],
  "validatorPlan": [
    {
      "validatorKey": "marketing-quality-validator",
      "validatorType": "marketing_quality",
      "assertionKeys": ["A-001", "A-004"]
    }
  ],
  "subtasks": [
    {
      "id": "st-1",
      "title": "...",
      "assignTo": "copywriter",
      "dependsOn": [],
      "assertionKeys": ["A-001", "A-002"],
      "intent": {"why": "...", "story": "...", "sensory": "...", "endState": "...", "ecology": "..."},
      "outputContract": {}
    }
  ],
  "outOfScope": []
}
```

### 7.5 Worker Prompt

Modify `MissionExecutePhaseService.buildSubtaskExecutionPrompt`.

Add:

- `ASSERTIONS_FOR_THIS_SUBTASK`.
- `EVIDENCE_TO_PRODUCE`.
- `VALIDATION_RISK`.
- `HANDOFF_REQUIRED`.

Worker response should include:

```json
{
  "content": "short internal summary",
  "summary": "brief summary",
  "assertion_evidence": [
    {
      "assertion_key": "A-001",
      "evidence": "what in the deliverable supports it",
      "deliverable_id": "uuid"
    }
  ],
  "handoff": {
    "completed": [],
    "left_undone": [],
    "risks": [],
    "commands_or_tools_used": []
  },
  "artifact_manifest": []
}
```

### 7.6 Validator Prompts

Add three validator modes.

#### Scrutiny Validator

Use for structural checks:

- Required artifacts exist.
- Required sections exist.
- Required integrations are configured.
- Data contracts are satisfied.
- Links/forms/routes are present.

#### User-Testing Validator

Use for flows:

- Open landing page.
- Click CTA.
- Submit form.
- Verify confirmation.
- Verify lead capture destination.
- Verify mobile/desktop basic usability when UI artifacts exist.

#### Marketing-Quality Validator

Use for marketing judgment:

- Avatar specificity.
- Pain point match.
- Offer clarity.
- Proof quality.
- Message-market fit.
- Generic AI anti-pattern detection.
- Brand voice.
- Conversion flow coherence.

Validator rubric dimensions for creative and marketing artifacts:

- Strategy: clear audience, offer, mechanism, proof, and conversion goal.
- Originality: avoids generic AI patterns and obvious template phrasing.
- Craft: concrete language, rhythm, sequencing, objection handling, and friction removal.
- Functionality: required assets, links, forms, tracking, responsiveness, and routing work.

Weight strategy and originality more heavily for Vibey marketing campaigns; functionality is still a blocking requirement when the mission includes deployable funnels, forms, or integrations.

### 7.7 Repair Prompt

New prompt mode: `MISSION_REPAIR`.

Input:

- Failed assertions.
- Validation evidence.
- Existing subtasks and outputs.
- Remaining context.

Output:

```json
{
  "kind": "repair_plan",
  "decision": "append_subtasks|retry_subtasks|reassign|replan|ask_user",
  "reason": "...",
  "repairs": [
    {
      "failedAssertionKey": "A-001",
      "action": "append_subtask",
      "subtask": {}
    }
  ]
}
```

---

## 8. Marketing Workflow Assertion Packs

**TLDR:** Full campaign missions need reusable assertion packs. The planner should not invent every landing page, email, form, and funnel validation criterion from scratch.

### 8.1 Landing Page Pack

Must assertions:

- Page has hero promise, avatar-specific pain, mechanism, offer, proof, objection handling, FAQ, CTA.
- Hero states a concrete outcome and audience.
- Copy avoids generic AI phrases and unsupported claims.
- CTA destination is clear and consistent.
- Visual hierarchy supports scanning.
- Brand voice and theme are applied.
- Mobile layout is usable.
- Required assets are present or intentional placeholders are approved.

Validators:

- Scrutiny: section existence and CTA.
- Marketing-quality: avatar/pain/offer/proof.
- User-testing: page load, CTA click, form flow.

### 8.2 Email Sequence Pack

Must assertions:

- Sequence has explicit goal and stage.
- Each email has one job.
- Subject lines are specific and not clickbait unless strategy calls for it.
- Pain, mechanism, proof, and CTA are distributed intentionally.
- Voice matches campaign.
- No contradictory offer promises.
- Sending platform/entity is created if requested.

Validators:

- Marketing-quality for persuasion.
- Scrutiny for structure and deliverable existence.

### 8.3 Form And Lead Capture Pack

Must assertions:

- Form fields match offer and lead qualification need.
- Submission destination is configured.
- Confirmation state exists.
- Required embeds or links are present.
- Test submission succeeds or missing integration is escalated.

Validators:

- User-testing and data-integrity.

### 8.4 Funnel Pack

Must assertions:

- Funnel stages are explicit.
- Landing page, form, thank-you/next step, and follow-up sequence connect.
- Tracking plan exists if analytics are requested.
- User journey is coherent from first touch to conversion.
- Each artifact references the same offer and avatar.

Validators:

- User-testing for flow.
- Marketing-quality for coherence.
- Scrutiny for artifact existence.

### 8.5 Anti-Pattern Pack

Generic AI copy flags:

- Vague claims with no concrete mechanism.
- "Unlock your potential" style phrasing without specific outcome.
- Pain points stated as broad categories instead of avatar language.
- Repeated sentence rhythm.
- CTA disconnected from offer.
- Proof without source or specificity.
- Benefits with no tradeoff, objection, or reason to believe.

These should become assertion criteria for marketing-quality validators.

---

## 9. UI Recommendations

**TLDR:** Mission Control should evolve from quick capture plus task overview into an intake/spec/validation workspace. Keep simple missions simple by collapsing sections when there are no questions or high-risk assertions.

### 9.1 Quick Capture

Current `MissionQuickCapture` is a single input plus campaign, priority, attachments, and capability warning.

Recommended additions:

- "Use campaign context" summary after campaign selection.
- "Context found" chips after research.
- "Missing context" chips before planning.
- Draft questions panel.
- Assumption approval panel.
- "Generate spec" button for high-impact missions.
- "Fast mission" path for low-risk simple tasks.

### 9.2 Plan Approval Becomes Spec Approval

Current `PlanDetailModal` shows execution plan, subtasks, recommended hires, approve/reject.

Recommended sections:

1. Context snapshot.
2. Clarifications and answers.
3. Assumptions.
4. Assertions.
5. Coverage matrix.
6. Subtasks.
7. Validator plan.
8. Recommended hires.

Approval button should mean:

> Approve context, assertions, plan, and validation strategy.

### 9.3 Mission Detail

Add an Assertions section:

- Total assertions.
- Passed/failed/pending.
- Filter by category.
- Show evidence per assertion.
- Show failed assertion repair actions.

Add a Validation Runs section:

- Validator type.
- Status.
- Assertion IDs.
- Evidence summary.
- Failed assertions.

### 9.4 Timeline

Add new event types:

- `mission.research.completed`
- `mission.clarification.pending`
- `mission.contract.created`
- `mission.assertion.coverage_verified`
- `mission.validation.started`
- `mission.validation.completed`
- `mission.assertion.failed`
- `mission.repair.created`

### 9.5 Realtime Updates

`useMissionDetailData` already subscribes to mission, logs, deliverables, subtasks, plans, and agents. Add subscriptions for:

- `mission_context_snapshots`
- `mission_clarification_questions`
- `mission_assertions`
- `mission_validation_runs`
- `mission_assertion_evidence`

---

## 10. Backend And Worker Implementation Plan

**TLDR:** Implement this as additive vertical slices. First persist specs and display them. Then enforce coverage. Then add validators. Then add repair automation.

### Phase 1: Schema And API

Files to add or modify:

- New migration under `supabase/migrations/`.
- `apps/api/src/modules/missions/dto/index.ts`
- `apps/api/src/modules/missions/repositories/missions.repository.ts`
- `apps/api/src/modules/missions/services/mission-spec.service.ts` (new)
- `apps/api/src/modules/missions/controllers/missions.controller.ts`
- `apps/api/src/modules/missions/controllers/internal-missions.controller.ts`
- `apps/api/src/modules/missions/missions.module.ts`

Add:

- Tables listed in section 6.
- DTO schemas for context snapshots, clarification answers, assertions, validation runs.
- Public read endpoints for spec data.
- User answer endpoint for clarification questions.
- Internal endpoints for worker phases to persist snapshots/assertions/validation results.

### Phase 2: Worker Phases

Files to add or modify:

- `apps/mission-worker/src/modules/missions/types/missions.types.ts`
- `apps/mission-worker/src/modules/missions/services/missions.service.ts`
- `apps/mission-worker/src/modules/missions/services/missions.outbox-dispatcher.service.ts`
- `apps/mission-worker/src/modules/missions/services/phases/mission-research-phase.service.ts` (new)
- `apps/mission-worker/src/modules/missions/services/phases/mission-clarification-phase.service.ts` (new)
- `apps/mission-worker/src/modules/missions/services/phases/mission-contract-phase.service.ts` (new)
- `apps/mission-worker/src/modules/missions/services/phases/mission-validation-phase.service.ts` (new)
- `apps/mission-worker/src/modules/missions/services/phases/mission-repair-phase.service.ts` (new)
- `apps/mission-worker/src/modules/missions/services/phases/mission-plan-phase.service.ts`
- `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`
- `apps/mission-worker/src/modules/missions/services/context/mission-context.service.ts`
- `apps/mission-worker/src/modules/missions/services/persistence/mission-state.repository.ts`
- `apps/mission-worker/src/modules/missions/missions.module.ts`

Add:

- Research phase that builds and persists context snapshot.
- Clarification phase that persists questions and blocks plan when required answers are missing.
- Contract phase that creates mission assertions.
- Plan phase coverage enforcement.
- Validation phase that runs validator prompts and persists results.
- Repair phase that creates targeted subtasks or replans from failed assertion IDs.

### Phase 3: Prompt And Skill Updates

Likely files:

- `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`
- System skills seeded in migrations or `MissionSkillSeederService`.
- Existing skills:
  - `mission-planner`
  - `mission-worker-executor`
  - `mission-reviewer`
  - `mission-triage`
  - `mission-quality-evaluator`

Add new skills:

- `mission-researcher`
- `mission-contract-writer`
- `mission-scrutiny-validator`
- `mission-user-testing-validator`
- `mission-marketing-quality-validator`
- `mission-repair-planner`

### Phase 4: UI

Files to modify:

- `apps/web/src/features/mission-control/types/index.ts`
- `apps/web/src/features/mission-control/services/missions.service.ts`
- `apps/web/src/features/mission-control/hooks/useMissionDetailData.ts`
- `apps/web/src/features/mission-control/components/MissionQuickCapture.tsx`
- `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.tsx`
- `apps/web/src/features/mission-control/components/dialogs/PlanDetailModal.tsx`
- `apps/web/src/features/mission-control/components/dialogs/SubtasksSection.tsx`
- `apps/web/src/features/mission-control/components/dialogs/ActivityTimeline.tsx`

Add new components:

- `MissionContextSnapshotPanel.tsx`
- `MissionClarificationPanel.tsx`
- `MissionAssertionsPanel.tsx`
- `MissionCoverageMatrix.tsx`
- `MissionValidationRunsPanel.tsx`

### Phase 5: Agent API Tools

Files:

- `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`
- Tests around action registry/RBAC.

Add actions:

- `list_mission_assertions`
- `record_mission_assertion_evidence`
- `create_mission_validation_run`
- `complete_mission_validation_run`
- `request_mission_repair`

Keep them narrow. Validators should not get broad mission mutation powers unless they are Vibey/manager.

---

## 11. Validation And Test Plan

**TLDR:** Tests should prove gates and evidence flow, not only prompt outputs. The minimum suite is schema validation, outbox phase mapping, plan coverage gate, validator result persistence, failed assertion repair, and UI rendering of spec/validation state.

### 11.1 API Tests

Add tests for:

- Creating a mission enqueues `mission.research.requested` or starts the internal research path.
- Persisting a context snapshot.
- Creating clarification questions.
- Answering required questions.
- Creating assertions.
- Rejecting plan approval when `must` assertions lack coverage.
- Accepting plan approval when all required assertions have coverage.
- Persisting validation runs and evidence.
- Failed assertions enqueue repair.

### 11.2 Worker Tests

Add tests for:

- Outbox dispatcher maps new event types to phases.
- Research phase writes snapshot.
- Clarification phase blocks planning when required question is unanswered.
- Contract phase writes assertions.
- Plan phase rejects missing assertion coverage.
- Validation phase records assertion results.
- Repair phase appends targeted subtasks.
- Existing execute/review behavior still respects output contracts.

### 11.3 UI Tests

Add tests for:

- Quick capture shows context/question state.
- Plan detail shows assertions and coverage.
- Pending approval can approve only after required questions are answered.
- Assertion panel shows pass/fail evidence.
- Failed assertion shows repair action.

### 11.4 Manual End-To-End Test

Scenario:

```text
Create mission:
"For this campaign, create a landing page, lead form, and 5-email follow-up for the primary avatar."

Expected:
1. System researches campaign, offer, avatar, theme, prior deliverables, brain, and integrations.
2. System asks which offer/avatar if ambiguous.
3. System creates assertion contract.
4. User approves spec.
5. Planner maps subtasks to assertions.
6. Workers create artifacts.
7. Validators check page, form, emails, and marketing quality.
8. Failed assertion creates repair subtask.
9. Mission completes only when must assertions pass.
```

---

## 12. System Constraints From Existing Guidelines

**TLDR:** The implementation must preserve current architecture: NestJS controller-service-repository layering, RLS-aware access, feature isolation, outbox reliability, prompt caching, mission runtime identity, and no broad service-role shortcuts.

Constraints:

- Keep controllers thin.
- Add business logic to services.
- Keep data access in repository or dedicated persistence service.
- Preserve RLS and org scoping.
- Do not create raw CSS or UI utility drift.
- Respect mission runtime identity: `system -> vibey`, `c_level/manager -> manager`, `employee -> employee`.
- Keep deterministic gates in code.
- Keep model judgment in prompts/skills.
- Use prompt caching patterns where OpenRouter calls include large stable context.
- Do not run builds automatically as part of implementation unless explicitly requested.

Important file-size concern:

- `apps/api/src/modules/missions/repositories/missions.repository.ts` is already very large and mixes mission persistence with agent/team operations.
- New spec persistence should preferably be a new focused repository/service instead of expanding this file further.

---

## 13. Architecture Decision: Assertions vs Output Contracts

**TLDR:** Do not replace subtask output contracts. Add mission assertions above them. Output contracts verify "the artifact exists and is the right kind." Assertions verify "the mission outcome is correct."

Current output contract example:

```json
{
  "artifact_kind": "document_artifact",
  "required_action": "create_docx",
  "required_artifact_type": "file",
  "expected": {
    "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
}
```

This is valuable and should stay.

New assertion example:

```json
{
  "assertion_key": "A-004",
  "statement": "The lead magnet copy addresses the avatar's top objection before asking for the opt-in.",
  "validator_type": "marketing_quality",
  "evidence_requirement": "Validator cites the objection source and the copy passage that handles it."
}
```

Relationship:

- Output contracts are deterministic artifact checks.
- Assertions are mission-level acceptance criteria.
- Validator runs prove assertions.
- Coverage maps connect assertions to subtasks and validators.

---

## 14. Model Strategy

**TLDR:** Use different model profiles by role. Planning and contract writing need careful reasoning. Workers need tool fluency and speed. Validators need precision and independent judgment.

Recommended:

- Research: strong retrieval/reranking plus concise synthesis model.
- Clarification: fast structured-output model.
- Contract writer: higher reasoning model.
- Planner: higher reasoning model.
- Worker: agent-selected model by domain.
- Scrutiny validator: precise instruction-following model.
- User-testing validator: tool/browser capable model.
- Marketing-quality validator: strong language/marketing judgment model.
- Repair planner: higher reasoning model when failed assertions require re-architecture.

Validation independence:

- Prefer a different session key and identity suffix for validators.
- For high-risk missions, consider a different model/provider from the worker.

---

## 15. Self-Evolving Loop

**TLDR:** Self-evolution should come from stored evidence and pattern updates, not from agents silently changing behavior. Failed assertions should teach future mission templates, assertion packs, and agent skills through explicit review.

Loop:

1. Validation run fails assertion.
2. Repair subtask fixes it.
3. Mission completes.
4. Evaluation drift stores quality scores.
5. Recurring failure patterns are summarized.
6. Human/architect approves changes to:
   - assertion packs,
   - planner skill,
   - worker skill,
   - validator rubric,
   - agent capability domains,
   - campaign brain/company brain memory.

Do not let the system automatically rewrite core skills without review. That would make failures harder to audit.

Additional harness-learning loop:

1. Read failed mission traces, not only final outputs.
2. Identify where model judgment diverged from the architect's judgment.
3. Classify the failure as missing context, weak assertion, weak validator, missing deterministic check, or tool/integration gap.
4. Fix the harness artifact that owns the failure.
5. Re-run a representative mission and compare assertion pass rates.

This keeps self-evolution operational and auditable. The harness gets better because the stored constraints get better.

---

## 16. Recommended First MVP

**TLDR:** Start with the smallest vertical slice that changes quality: context snapshot, clarifications, assertions, coverage in plan approval, and one validator. Do not build every validator or workflow pack first.

MVP scope:

1. Add `mission_context_snapshots`.
2. Add `mission_clarification_questions`.
3. Add `mission_assertions`.
4. Add assertion fields in plan output and subtask rows or coverage table.
5. Add context/clarification/assertion panels in `PlanDetailModal`.
6. Add coverage gate before plan approval.
7. Add marketing-quality validator that records assertion results.
8. Failed assertions send subtasks back to `todo` with assertion-specific feedback.

Defer:

- Browser/user-testing validator.
- Full repair planner.
- Many workflow-specific assertion packs.
- New board statuses.
- Full agent API assertion tools.

Why this MVP:

- It proves the new mental model.
- It improves planning quality immediately.
- It uses current outbox/review machinery.
- It avoids a large rewrite.

---

## 17. Open Decisions For Architect

**TLDR:** The main decisions are product posture, schema granularity, status model, validator depth, and how much friction to add before planning.

1. Should every mission go through research/contract, or only high-risk missions?
2. Should required clarifications block planning, or should user-approved assumptions be enough?
3. Should mission phases become new `missions.status` values, or live in a new spec status field?
4. Should assertions be dedicated rows from day one, or JSON inside `missions_plans.content` for MVP?
5. Should validators be manager/Vibey personas first, or separate worker agents?
6. Should user-testing validators run only for website/funnel/form artifacts?
7. How strict should plan approval be when assertions are uncovered?
8. Which workflow assertion pack should ship first: landing page, email sequence, or full funnel?

My recommendation:

- Dedicated rows from day one for assertions and validation runs.
- Keep new pre-plan states in spec tables first, not board statuses.
- Apply research/contract to all missions, but auto-collapse for simple missions.
- Block planning only on required questions.
- Ship landing page plus email/funnel assertion packs first because they map directly to the user's marketing workflow vision.

---

## 18. Final Recommendation

**TLDR:** Build Mission Spec V2 as an additive layer over the existing mission runner. Make correctness explicit before planning, keep deterministic gates in code, keep worker execution mostly unchanged, and give the user an approval surface for context, questions, assertions, coverage, and validators.

The current mission system is not "baby-like" in infrastructure anymore. It is mature in dispatch, execution, and repair mechanics. The baby part is the mission specification layer.

The best system is:

- Context-aware before planning.
- Clarification-driven when evidence is weak.
- Assertion-based before work starts.
- Coverage-enforced before approval.
- Worker-scoped during execution.
- Validator-independent after execution.
- Evidence-persistent for audit and improvement.
- Repair-driven by failed assertion IDs.

That architecture takes the strongest lesson from the video and fits it into the codebase's existing shape instead of fighting it.
