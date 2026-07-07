# Agent Learning Loops

Last Modified: 2026-06-28

## Architect Summary

Agent Learning Loops are the Jamie-owned improvement system for Vibey agents.

The product idea is simple:

> Every agent leaves a work trail. Jamie reads that trail, ranks what matters, classifies the real cause, proposes the smallest correct upgrade, waits for approval, applies through guarded paths, and then measures whether the upgrade worked.

Current status: the first Jaime-owned lane is implemented through Agent Improvements. It now covers skill creation, skill updates, skill resource updates, and guarded agent-file updates for `ROLE.md`, `IDENTITY.md`, and `SOUL.md`. Brain and platform issues are observed and routed, but they are not yet unified into the same visible improvement proposal lane.

This plan turns the brainstorm into one reviewable artifact. It covers:

- the long-term UX for message and mission feedback
- the platform measurements behind agent quality
- the ranking math for deciding what deserves attention
- the classification system for choosing the right fix layer
- the proposal format Jamie should generate
- the approval and apply boundary
- the file-level implementation roadmap based on existing repo evidence

## Technical Evidence

- `.docs/plans/agent-learning-loops-v2.md`: Current implemented Jaime lane for `skill_create`, `skill_update`, `skill_resource_update`, `agent_file_update`, route-outs, checkpoints, experiments, and keep/revise/revert decisions.
- `documentation/features/skill-recommendations.md`: Current Agent Improvements entrypoint. It now backs org-owned skills, skill resources, and agent-file proposals through `agent_improvement_proposals`.
- `documentation/features/dream-ops.md`: Dream Ops evidence loop for `agent_learning_dream`, Jaime proposal tools, hidden route-outs, and Atlas Company Cortex signal work.
- `supabase/migrations/20260605140000_skill_recommendations.sql`: Existing skill recommendation schema with event, candidate, job, and recommendation tables.
- `apps/agent-api/src/modules/chat/services/skill-recommendation-event-recorder.service.ts`: Existing post-chat completion signal recorder for repeated no-skill workflows.
- `apps/api/src/modules/skill-recommendations/services/agent-learning-loop-policy.service.ts`: Current classification, ranking, artifact ownership, proposal quality, route-out, conflict, and experiment decision policy.
- `apps/api/src/modules/skill-recommendations/services/agent-learning-loop-apply.service.ts`: Current guarded apply path for skills and agent files, including checkpoints, experiments, and revert behavior.
- `apps/api/src/modules/skill-recommendations/*`: API-side settings, proposal, detail, apply, and evaluation layer for Jamie-reviewed Agent Improvements.
- `apps/web/src/features/home/components/cards/SkillRecommendationsCard.tsx`: Existing Home surface for ready and pending skill recommendations.
- `apps/web/src/features/settings/components/settings-content/SkillRecommendationsPageContent.tsx`: Existing opt-in settings surface for skill recommendations.
- `apps/web/src/features/mission-control/components/dialogs/MissionRatingStrip.tsx`: Existing user feedback UI with thumbs, rating, and optional text.
- `apps/api/src/modules/missions/controllers/missions-feedback.controller.ts`: Existing authenticated `POST /missions/:id/rate` endpoint.
- `apps/api/src/modules/missions/dto/mission-core.dto.ts`: Existing rating schema requiring thumbs or rating, with optional feedback capped at 4000 characters.
- `apps/api/src/modules/missions/services/missions-user-operations.service.ts`: Existing mission rating write path into `evaluation_drift`.
- `apps/api/src/modules/missions/repositories/missions-user-operations.repository.ts`: Existing repository methods for finding, updating, and inserting `evaluation_drift`.
- `supabase/migrations/20260331220100_evaluation_drift_table.sql`: Existing human/model rating table with `model_quality_score`, `human_rating`, `human_thumbs_up`, `human_feedback`, `model_dimension_scores`, `quality_eval_payload`, and generated `drift_magnitude`.
- `apps/mission-worker/src/modules/dream-ops/agent-learning-dream-collector.service.ts`: Current collector for skill recommendation events, turn feedback, traces, activity, and mission logs.
- `apps/mission-worker/src/modules/dream-ops/agent-learning-dream-runner.service.ts`: Current Dream Ops runner that sends bounded evidence to Jaime and counts proposals.
- `apps/agent-api/src/modules/artifacts/services/artifact-dream-ops.service.ts`: Current Jaime tool surface for proposing skill changes, agent-file changes, and route-outs.
- `apps/api/src/modules/brain/services/company-cortex.service.ts`: Current Atlas Company Cortex signal/object review path, separate from Jaime Agent Improvements.
- `apps/agent-api/src/modules/artifacts/services/artifact-brain-lint-actions.service.ts`: Current Brain lint action surface, not yet unified into the Agent Improvements lane.
- `.docs/plans/suggestion-improvement-layer.md`: Existing cross-building roadmap. `SIL-R04`, `SIL-R05`, `SIL-R06`, `SIL-R10`, and `SIL-R11` are the closest roads to Agent Learning Loops.
- `https://github.com/karpathy/autoresearch`: External reference pattern. The repo runs a small autonomous research loop where an agent edits one bounded file, runs a fixed-time experiment, reads one primary metric, logs the result, keeps improvements, discards regressions, and repeats. Its `program.md` acts like a lightweight agent instruction/skill file.

## Recommended Approach

Build Agent Learning Loops as an expansion of the existing skill recommendation and mission feedback surfaces.

The first expansion already happened for Jaime-owned agent operating code. The next plan work should connect Brain quality and hidden route-outs into a repeatable review system without pretending that Brain, workflow, product, or platform issues are user-approvable agent changes.

Do not create a separate autonomous mutator. The right shape is:

1. Broaden signal capture beyond repeatable no-skill workflows.
2. Normalize human and platform signals into typed observations.
3. Compute run-level and candidate-level scores.
4. Let Jamie classify the pattern and draft a proposal.
5. Require user/admin approval before any agent, skill, role, identity, soul, tool, or runtime artifact changes.
6. Apply through existing guarded update paths or through new guarded apply handlers where no path exists.
7. Measure whether accepted changes improve future work.
8. Capture the result so future proposals reuse what was learned.

## Current System Summary

What exists today:

- Skill recommendations have grown into Agent Improvements for Jaime-owned operating code.
- The live proposal lane supports `skill_create`, `skill_update`, `skill_resource_update`, `agent_file_update`, and hidden `route_out`.
- Approved skill and agent-file proposals apply through guarded paths after a checkpoint is created.
- `agent_learning_experiments` records the measurement loop and supports `keep`, `revise`, `revert`, and `inconclusive`.
- Mission feedback writes into `evaluation_drift`, and agent turn feedback is part of the Agent Improvements evidence set.
- Atlas Company Cortex signals and objects exist as the Brain-side review path.
- Brain lint and cross-suggestion primitives exist, but they are not yet unified with Agent Improvements.

What is still missing:

- message-level feedback across the main chat surfaces
- chip-based feedback taxonomy
- one visible improvement queue that can explain Brain suggestions, hidden route-outs, and Jaime-owned agent proposals side by side
- richer diff editing for skill, skill resource, and agent-file proposals
- internal route-out queue UI for product, platform, Brain, workflow, and system-owned findings
- broader historical replay runner for old traces and feedback
- live Vibey MCP Brain refresh in this session, because no Vibey MCP tool was exposed

## External Pattern: karpathy/autoresearch

The user pointed to Karpathy's open-source `autoresearch` project as a related concept.

Important correction:

- The repo is `karpathy/autoresearch`, not `auto-Researcher`.
- The author is Andrej Karpathy.
- The repo is an autonomous research harness for improving a small LLM training setup, not a product feedback or agent-management system.

### What autoresearch Does

In simple words:

> Give an agent a small experiment sandbox, one file it can edit, one metric that matters, a fixed run budget, and a keep/discard rule.

The loop is:

1. Read the instruction file.
2. Establish a baseline run.
3. Edit only the allowed file.
4. Commit the change.
5. Run the experiment with a fixed time budget.
6. Extract the primary metric.
7. Log the result.
8. Keep the change if the metric improves.
9. Revert the change if it does not improve.
10. Repeat.

### What We Should Borrow

#### One Bounded Editable Surface

`autoresearch` intentionally makes the agent edit only `train.py`. That keeps scope manageable and diffs reviewable.

Vibey adaptation:

- Every Agent Upgrade Proposal needs one primary target artifact.
- Examples: one skill, one role block, one identity block, one tool guidance block, one retrieval rule, one workflow definition.
- Jamie should not propose a broad multi-surface mutation unless the evidence shows the surfaces are coupled.

#### Fixed Evaluation Window

`autoresearch` uses a fixed experiment budget so results are comparable.

Vibey adaptation:

- Every approved upgrade should define a measurement window before apply.
- The window can be time-based, run-count-based, or both.
- Do not compare across unrelated orgs, agents, or workflows. Compare the agent against its own baseline.

#### Primary Metric Plus Guardrails

`autoresearch` optimizes one primary metric while also logging memory and crash status.

Vibey adaptation:

- Every proposal should name one primary success metric.
- It should also name guardrail metrics that must not get worse.

Examples:

- Primary: fewer repeated tool contract failures.
- Guardrail: no drop in user acceptance.
- Primary: higher source fidelity.
- Guardrail: no meaningful increase in completion time.
- Primary: lower user correction rate.
- Guardrail: no increase in abandoned runs.

#### Experiment Ledger

`autoresearch` logs each experiment into a simple table with commit, metric, memory, status, and description.

Vibey adaptation:

- Agent Learning Loops need an upgrade ledger.
- The ledger should store proposal id, approved change, baseline score, treatment score, primary metric, guardrails, status, evidence ids, approver, and rollback checkpoint.

This prevents Jamie from saying "I improved the agent" without measurable proof.

#### Keep / Discard / Revise

`autoresearch` advances when the metric improves and reverts when it does not.

Vibey adaptation:

- Approved upgrades should not simply become permanent.
- After measurement, each upgrade should become `keep`, `revert`, or `revise`.

This is the missing loop after apply.

#### Program File As Agent Operating Code

`autoresearch` treats `program.md` as the human-edited instruction file that defines how the agent should research.

Vibey adaptation:

- Agent role, identity, soul, skills, and tool guidance are our version of "agent operating code."
- Jamie's job is to propose better operating code based on observed work.
- The human remains the editor/approver of the operating code.

### What We Should Not Borrow

#### No Silent Indefinite Mutation

`autoresearch` is built for an overnight autonomous sandbox. That is not the right default for Vibey production agents.

Vibey rule:

> Jamie can run reviews continuously, but agent upgrades require approval before mutation.

#### No Single Score For Everything

`autoresearch` can optimize one metric because the task is narrow. Vibey agent work is multi-dimensional.

Vibey rule:

> Use one primary metric per proposal, but keep component score breakdowns visible.

#### No Live Broad-Surface Editing

`autoresearch` allows direct edits inside an experiment branch. Vibey should not let Jamie freely edit role, soul, tools, skills, workflows, and runtime policy together.

Vibey rule:

> One proposal, one primary target artifact, one checkpoint, one apply path.

#### No Cross-Context Score Comparisons

`autoresearch` results are platform-local because the fixed-time metric depends on the machine. Vibey results will also be context-local.

Vibey rule:

> Compare before/after for the same agent, org, workflow, and task family where possible.

### Vibey Adaptation: Agent Upgrade Experiment

Agent Learning Loops should introduce an `Agent Upgrade Experiment` concept.

Simple definition:

> An approved Jamie proposal becomes a measured experiment, not an untracked permanent change.

Fields:

- proposal id
- target agent
- target artifact
- classification
- approved change
- baseline window
- measurement window
- primary success metric
- guardrail metrics
- expected improvement
- risk level
- rollback checkpoint
- status
- result summary

Lifecycle:

1. `proposed`
2. `approved_for_experiment`
3. `applied_with_checkpoint`
4. `measuring`
5. `keep`
6. `revert`
7. `revise`

### Updated Product Principle

The strongest version of Agent Learning Loops is:

> Jamie does not only suggest changes. Jamie runs approved improvement experiments on agent operating code and proves whether the upgrade worked.

## Ownership And Routing Model

Every candidate needs an owner before Jamie proposes anything.

Simple rule:

> Jamie can improve agent operating code. Jamie can report platform problems. Jamie cannot mutate platform code, global schemas, preflight validators, runtime transports, or shared tool contracts.

### Ownership Levels

#### User-Owned

Meaning:

> The issue belongs to one user's preference or one user's working style.

Examples:

- User wants shorter answers.
- User wants outputs in a specific format.
- User prefers a specific approval style.

Allowed outcome:

- preference proposal
- User Brain memory candidate
- Space-level instruction candidate

Approval:

- the user or Space owner approves

#### Org-Owned

Meaning:

> The issue belongs to one organization's agents, skills, workflows, Spaces, or operating style.

Examples:

- This org's HR agent needs a stronger interview-score rubric.
- This org repeats one reporting workflow every week.
- This org's sales agent should use a specific CRM writing pattern.

Allowed outcome:

- skill proposal
- agent instruction proposal
- org workflow proposal
- Space/context rule proposal

Approval:

- org owner/admin approves

#### Agent-Owned

Meaning:

> The fix changes one agent's operating code without changing platform behavior.

Examples:

- role wording
- identity wording
- soul wording
- skill content
- agent-specific source-priority instruction

Allowed outcome:

- Agent Upgrade Experiment

Approval:

- user/org owner approves, then the experiment is measured

#### Platform-Owned

Meaning:

> The issue is caused by Vibey itself, not by one user, one org, or one agent's instructions.

Examples:

- action schema mismatch
- preflight validator too strict or too loose
- generated tool docs drift from executable schema
- model-visible tool error contract is unclear
- status says `done` when the final response failed
- missing event capture
- UI has no approval path
- runtime circuit breaker missing

Allowed outcome:

- platform signal
- platform improvement cluster
- engineering/product intake item
- platform fix experiment after engineering approval

Approval:

- Vibey platform/product/engineering owns approval, implementation, rollout, and rollback

### Routing Rule

Jamie should never show a platform-owned issue as if the user can approve it.

Instead:

1. The org's Jamie records a local platform signal.
2. The platform aggregates similar signals across orgs.
3. A platform-owned issue is created only when the aggregate crosses threshold.
4. Engineering/product reviews the cluster with redacted evidence.
5. A platform fix is implemented by the platform team.
6. The same Agent Learning Loop measurement system checks whether the fix improved the affected metric.

This keeps user-facing Jamie useful without making each org responsible for platform code.

## Practical Platform Intake Loop

This is the concrete workflow for product/platform suggestions.

### Local Org Jamie

Each organization's Jamie can see its own org evidence.

When Jamie finds a platform-owned issue, it does not create a user approval card for schema/runtime changes. It emits a local platform signal:

- org id
- agent key
- feature area
- classification
- fingerprint
- severity
- affected action/tool/runtime surface
- redacted evidence ids
- first seen
- last seen
- recurrence count
- suggested owner area

Example:

```text
classification = platform_tool_contract_problem
surface = create_contact
fingerprint = missing_required_field_contact_id_schema_rejects_source_anchor
local_recurrence = 14
suggested_owner_area = agent-api artifact action schemas
```

### Platform Aggregator

The platform aggregator groups local signals into global clusters.

Cluster keys:

- classification
- feature area
- action/tool name
- error fingerprint
- runtime surface
- schema/preflight fingerprint
- app surface

The aggregator computes:

- affected org count
- affected agent count
- affected run count
- last seen
- recurrence trend
- severity
- confidence
- example redacted traces
- likely owner area
- whether a similar engineering item already exists

### Engineering/Product Queue

Only clusters cross into engineering/product when they pass threshold.

Example thresholds:

- high severity in one org with repeated failures
- same fingerprint across multiple orgs
- schema/runtime failure affecting a core action
- issue blocks task completion or causes repeated loops
- issue creates misleading user state
- issue causes data loss or missing durable artifact

Engineering sees one clustered item, not one item per org.

Item shape:

- title
- owner area
- problem class
- primary metric hurt
- affected org count
- affected run count
- first seen / last seen
- representative redacted evidence
- suggested fix surface
- blast radius
- rollout plan
- measurement plan

### Platform Fix Experiment

Platform-owned fixes can still use the `autoresearch` lesson, but the experiment is different from an org agent upgrade.

For platform fixes:

- baseline = affected cluster before fix
- treatment = same cluster after release
- primary metric = the failing platform signal
- guardrails = no regression in adjacent actions, completion rate, or user acceptance
- decision = keep rollout, rollback, or revise

The approver is the platform team, not the customer.

### User-Facing Experience

Most users should not see raw platform issue clusters.

Possible user-facing states:

- For low-impact internal issues: show nothing.
- For recurring annoyance: show "Vibey detected a platform issue and reported it."
- For blocked work: show a clear user-facing explanation and recovery path.
- After fix: optionally show "This issue was fixed" if the user was directly affected.

This keeps Jamie trustworthy: it does not pretend the user can approve a schema change.

## Purpose

Agent Learning Loops are the long-term improvement system for Vibey agents.

Simple definition:

> Every agent leaves a work trail. Jamie reads that trail, finds where the agent is getting better or worse, then suggests upgrades.

This system expands the current skill recommendation idea into a broader agent improvement loop. It should not only detect repeated actions that can become skills. It should also detect when an agent needs a better role, identity, soul, workflow rule, tool instruction, context rule, or runtime behavior.

## Core Loop

1. Observe
2. Reduce to the owner and root cause
3. Rank
4. Classify
5. Propose
6. Approve
7. Apply with a checkpoint
8. Measure
9. Capture what was learned

The approval boundary is important. Jamie should be responsible for reviewing evidence and proposing upgrades. Jamie should not silently mutate agents without user approval.

## Current Starting Points

- `documentation/features/skill-recommendations.md` already describes repeatable no-skill workflows becoming Jamie-reviewed skill proposals.
- `.docs/plans/agent-learning-loops-v2.md` documents the implemented expansion from skill-only recommendations into Agent Improvements for skills, skill resources, and agent files.
- `agent_turn_feedback` and `skill_recommendation_events` are already part of the Jaime evidence loop.
- Mission ratings already write human feedback into `evaluation_drift`.
- Existing mission feedback UI already supports thumbs, rating, and optional feedback.

Agent Learning Loops should reuse those patterns instead of inventing a separate improvement system from scratch.

## 1. Observe

Observation means collecting evidence from real agent work.

There are two observation families:

1. Human signals
2. Platform signals

### Human Signals

Human feedback answers:

> What did the user think about this exact agent output?

The long-term UX should allow feedback on agent messages, final answers, mission outputs, tool-heavy steps, and generated artifacts.

Recommended message feedback flow:

1. Every important agent message has thumbs up and thumbs down.
2. Clicking a thumb opens a small feedback panel near the message.
3. The user can choose chips and optionally write free text.
4. The feedback is attached to the exact judged object.

Example feedback chips:

- Helpful
- Wrong
- Too slow
- Used wrong tool
- Missed context
- Great result
- Needs more detail
- Should remember this
- Repeated itself
- Got stuck
- Bad format
- Good format

Feedback should attach to the most specific available target:

- message
- agent run
- tool call
- mission step
- Space item
- generated artifact
- final output

### Platform Signals

Platform signals answer:

> What actually happened during the work?

These signals are not opinions. They are behavior.

Important platform questions:

- Did the agent call tools correctly?
- How many tool calls succeeded?
- How many tool calls failed?
- Did it retry the same bad tool call?
- Did it correct itself after a tool error?
- Did it use the right source of truth?
- Did it miss available context?
- Did the user have to correct it?
- Did the task finish?
- Did it stop halfway?
- Did another agent or user have to redo the work?
- Did the output get accepted, rejected, edited, or ignored?
- Did the mission rating go up or down?

## Measuring Platform Signals

Every raw signal should become a normalized measurement from `0` to `1`.

- `1` means healthy.
- `0` means unhealthy.
- Missing evidence should be `unknown`, not `0`.

This matters because absence of evidence is not the same as failure.

### Tool Success Score

Question:

> Did tool calls complete successfully?

Formula:

```text
tool_success_score = successful_tool_calls / total_tool_calls
```

If there were no tool calls, this score is `unknown`.

### Tool Contract Score

Question:

> Did the agent send valid payloads to tools?

Formula:

```text
tool_contract_score = valid_tool_payloads / total_tool_payloads
```

Examples of bad contract behavior:

- missing required fields
- invalid enum values
- wrong ids
- schema preflight failures
- repeated unchanged payload after validation failure

### Tool Recovery Score

Question:

> When a tool failed, did the agent correct the cause?

Formula:

```text
tool_recovery_score = corrected_failed_tool_calls / failed_tool_calls
```

This should reward agents that learn within a run. A failed first call is less serious if the second call fixes the payload correctly.

### Repeat Failure Score

Question:

> Did the agent repeat the same mistake?

Formula:

```text
repeat_failure_score = 1 - min(1, repeated_same_failure_count / repeat_failure_limit)
```

Suggested first limit:

```text
repeat_failure_limit = 3
```

An agent that repeats the same failing payload three times gets a `0` for this score.

### Stuckness Score

Question:

> Did the run keep moving toward the goal?

Simple formula:

```text
stuckness_score = 1 - min(1, stuck_events / stuck_event_limit)
```

Potential stuck events:

- same tool failure repeated
- no meaningful progress after several turns
- agent asks the same question again
- agent restarts a completed step
- context overflow causes recoverable failure
- workflow circuit breaker triggers

Suggested first limit:

```text
stuck_event_limit = 3
```

### Source Fidelity Score

Question:

> Did the agent use the right source of truth?

Formula:

```text
source_fidelity_score = correct_source_uses / required_source_uses
```

Examples:

- If the user uploaded a file, the agent should inspect the file before guessing.
- If a task depends on Space context, the agent should check Space context before broad Brain search.
- If a schema/data question depends on Supabase, the agent should query schema/data instead of guessing.

This score will often require rule-based expected-source detection.

### Completion Score

Question:

> Did the task reach a real finish?

Suggested scoring:

```text
1.00 = completed and accepted
0.80 = completed with no explicit feedback
0.60 = completed but required follow-up correction
0.30 = partial output only
0.00 = failed, cancelled, abandoned, or stopped halfway
```

Completion should not trust a single runtime status blindly. A run marked `done` can still be low-quality if the final model response failed, the user rejected it, or required artifacts were missing.

### User Correction Score

Question:

> Did the user have to correct the agent?

Formula:

```text
user_correction_score = 1 - min(1, user_correction_count / correction_limit)
```

Suggested first limit:

```text
correction_limit = 3
```

Examples of correction:

- user says the answer is wrong
- user says the agent missed a file/context
- user asks the agent to redo the same work
- user manually edits or rejects the generated output

### Rework Score

Question:

> Did someone else have to redo the work?

Formula:

```text
rework_score = 1 - min(1, rework_events / rework_limit)
```

Potential rework events:

- same mission reopened
- task moved back to revision
- another agent assigned to fix output
- generated artifact replaced quickly
- user repeats the same request after the agent claims completion

### Acceptance Score

Question:

> Did the user accept the output?

Suggested scoring:

```text
1.00 = explicit approval, thumbs up, accepted artifact, or approved mission
0.70 = no explicit feedback but user continued successfully
0.40 = user edited heavily
0.20 = user asked for major revision
0.00 = thumbs down, rejected, dismissed, or abandoned
```

### Mission Rating Delta

Question:

> Is this agent getting better or worse over time?

Formula:

```text
mission_rating_delta = recent_average_rating - baseline_average_rating
```

Then normalize:

```text
rating_trend_score = clamp((mission_rating_delta + 2) / 4, 0, 1)
```

This gives:

- strong decline -> near `0`
- flat trend -> around `0.5`
- strong improvement -> near `1`

### Run Quality Score

The platform can combine these measurements into one run-level quality score.

Suggested first version:

```text
run_quality_score =
  0.18 * completion_score +
  0.15 * acceptance_score +
  0.14 * tool_success_score +
  0.12 * tool_contract_score +
  0.10 * tool_recovery_score +
  0.10 * source_fidelity_score +
  0.08 * repeat_failure_score +
  0.08 * user_correction_score +
  0.05 * rework_score
```

Rules:

- Only include known scores.
- Re-normalize weights across known scores.
- Store the score with component breakdowns, not only the final number.
- Never let the final score hide the reason. Jamie needs the reasons.

Example:

```text
run_quality_score = 0.42
top_negative_signals = ["tool_contract_score", "repeat_failure_score", "source_fidelity_score"]
```

That tells Jamie the problem was not generic quality. It was probably bad tool guidance or missing context rules.

## 2. Rank

Ranking decides which observations deserve attention.

Simple question:

> What improvement would make the biggest real difference?

Every observation can become an improvement candidate, but not every candidate should become a recommendation.

Suggested candidate ranking formula:

```text
candidate_priority =
  impact *
  recurrence *
  confidence *
  freshness *
  scope_fit -
  risk
```

### Impact

Impact asks:

> How much does this hurt real work?

Signals:

- failed or blocked mission
- low rating
- thumbs down
- user correction
- important workflow affected
- revenue/customer-facing work affected
- repeated manual rework

### Recurrence

Recurrence asks:

> Is this a pattern or a one-off?

Signals:

- same agent
- same tool
- same workflow
- same failure fingerprint
- same user correction category
- same missing context type
- same repeated prompt/tool signature

### Confidence

Confidence asks:

> Do we have enough evidence to recommend a change?

Higher confidence:

- human feedback plus platform failure
- repeated traces with same fingerprint
- same failure across multiple users or missions
- clear target file/artifact to change

Lower confidence:

- one vague thumbs down
- missing trace data
- ambiguous user complaint
- no clear fix target

### Freshness

Freshness asks:

> Is this still happening?

Recent failures should rank higher than old failures. A candidate should decay if the issue stops happening.

### Scope Fit

Scope fit asks:

> Is this the right level for an upgrade?

Examples:

- One user's preference should become memory or preference, not an agent-wide role change.
- A repeated failure across many users can become an agent instruction or skill upgrade.
- A tool schema problem should become a tool/preflight fix, not a skill.

### Risk

Risk asks:

> How dangerous is this change?

Higher risk:

- changes role, identity, or soul
- affects many users
- changes tool behavior
- changes workflow permissions
- changes a system-owned agent

Lower risk:

- creates a narrow skill draft
- adds a small retrieval instruction
- proposes a user-specific preference
- improves a local workflow example

## 3. Classify

Classification decides what kind of problem Jamie found.

The same observation can point to different fixes. That is why classification must happen before proposing.

### Classification Types

#### Personal Preference

Meaning:

> This user prefers something.

Examples:

- User likes shorter answers.
- User wants a specific format.
- User prefers direct summaries before detail.

Likely fix:

- User Brain memory
- user preference
- Space-level instruction

Not likely fix:

- agent-wide role change

#### Agent Instruction Gap

Meaning:

> The agent misunderstands how it should behave.

Examples:

- Agent stops too early.
- Agent guesses instead of checking data.
- Agent writes in the wrong tone.
- Agent misses its responsibility boundary.

Likely fix:

- role update
- identity update
- soul update
- instruction contract update

#### Skill Opportunity

Meaning:

> A repeated workflow should become a reusable skill.

Examples:

- Same task repeated across conversations.
- Same tool sequence appears often.
- User repeatedly asks for the same output format.

Likely fix:

- create skill
- update skill
- add skill examples
- add skill resources

#### Agent Tool Guidance Problem

Meaning:

> The agent has enough platform support, but its local instructions or examples make it use the tool poorly.

Examples:

- agent chooses the wrong tool even though the right tool exists
- agent omits optional fields that would improve output quality
- agent does not read the tool result carefully
- agent uses the tool before gathering required context
- agent needs a better skill example for a valid tool flow

Likely fix:

- skill update
- agent instruction update
- generated runtime guidance for that agent family
- tool-use example

Not likely fix:

- action schema update
- preflight validator update
- platform action contract change

#### Platform Tool Contract Problem

Meaning:

> The tool contract, schema, preflight validator, generated docs, runtime transport, or error mapping is wrong or unclear.

Examples:

- repeated schema errors
- invalid enum values
- wrong id fields
- retrying unchanged failed payloads
- generated docs disagree with executable schemas
- tool error does not tell the agent how to correct payload
- schema rejects a valid business case
- preflight permits payloads the executor later rejects

Likely fix:

- action schema update
- preflight validator update
- tool description update
- generated tool docs update
- contract tests

Owner:

- platform engineering/product, not org Jamie

Jamie outcome:

- emit platform signal and route to platform aggregation, not user approval

#### Context Retrieval Problem

Meaning:

> The agent used the wrong source or missed available context.

Examples:

- ignored uploaded files
- searched Brain before current Space documents
- guessed schema instead of checking Supabase
- missed mission or task history

Likely fix:

- retrieval instruction update
- context routing rule
- source-priority rule
- generated runtime guidance update

Ownership split:

- If the source existed and the agent ignored it, this is agent-owned.
- If the source was unavailable, not indexed, not exposed to the agent, or invisible in trace data, this is platform-owned.

#### Workflow Circuit Problem

Meaning:

> The agent got stuck in a repeated failing loop.

Examples:

- same bad tool call repeats
- adjacent tool loops around same failure
- retries happen without correction

Likely fix:

- workflow circuit breaker rule
- structured tool error mapping
- retry policy update
- agent instruction update

Ownership split:

- If one agent lacks a retry rule, this is agent-owned.
- If the shared circuit breaker or tool error contract is missing, this is platform-owned.

#### Runtime/Product Problem

Meaning:

> The agent may be doing the best it can, but the platform surface is missing something.

Examples:

- tool error is too vague
- UI gives no clear approval path
- artifact state is not recorded
- status says done even when output failed

Likely fix:

- product/backend change
- runtime status change
- observability improvement
- new event capture

## 4. Propose

Proposing means Jamie turns a classified pattern into a reviewable upgrade.

Simple question:

> What should change, where should it change, and why?

### Agent Upgrade Proposal

Every proposal should include:

- title
- target agent
- classification
- priority score
- evidence summary
- affected users, missions, or runs
- proposed change
- exact target artifact
- expected improvement
- risk level
- approval mode
- rollback/checkpoint plan

### Proposal Types

#### Skill Proposal

Use when the issue is repeated work.

Targets:

- agent skill
- skill resources
- skill examples

Approval:

- user reviews and edits before creating or updating the skill

Current implementation:

- `skill_create`
- `skill_update`
- `skill_resource_update`

#### Instruction Proposal

Use when the issue is behavior.

Targets:

- role
- identity
- soul
- system instruction
- generated runtime guidance

Approval:

- show a diff-like proposal and require approval

Current implementation:

- `agent_file_update` for `ROLE.md`, `IDENTITY.md`, and `SOUL.md`
- `name` and `role` are part of Jaime's owned scope in V2, but the current guarded file apply path is limited to the three agent files above.

#### Route-Out Proposal

Use when the evidence is real but the fix does not belong to Jaime.

Targets:

- Brain or memory quality
- workflow or automation behavior
- product bugs
- platform tool contracts
- runtime, transport, or infrastructure behavior
- system-owned agents or official/system skills

Approval:

- route-outs are persisted as hidden findings today
- they need an internal review queue before they become a full improvement lane

#### Tool Guidance Proposal

Use when the issue is agent-local tool use.

Targets:

- skill example
- agent instruction
- tool-use guidance inside one agent family
- source-priority rule for a tool workflow

Approval:

- user/org approval when it changes an org-owned agent or skill

Non-goal:

- does not change global action schemas, validators, transports, or platform docs

#### Context Rule Proposal

Use when the issue is missing or wrong source of truth.

Targets:

- retrieval policy
- source-priority rule
- Space/Brain routing rule
- runtime instruction

Approval:

- require evidence showing the missed source was actually available

#### Preference Proposal

Use when the signal belongs to one user or one Space.

Targets:

- User Brain
- Space memory
- local preference config

Approval:

- lightweight approval or inline save

#### Product Fix Proposal

Use when the agent is not the real source of the problem.

Targets:

- action schema
- preflight validator
- generated tool docs
- action contract
- backend event capture
- UI state
- runtime status semantics
- error contract
- approval workflow

Approval:

- route to product/engineering, not agent self-upgrade

Practical path:

- org Jamie emits a local platform signal
- platform aggregator dedupes and ranks it
- engineering/product sees one clustered item with redacted evidence
- platform team decides, implements, releases, and measures

### Proposal Quality Gate

Jamie should only propose a change when:

- evidence is fresh enough
- confidence passes threshold
- the classification is clear
- there is a concrete target
- the change is reviewable
- the risk is stated
- rollback is possible

Jamie should skip or hold when:

- evidence is vague
- the problem may be personal preference
- the target artifact is unclear
- the issue is probably a platform bug
- the proposed fix would be too broad

## 5. Approve

Approval keeps the system safe.

The user should be able to approve:

- create skill
- update skill
- update role
- update identity
- update soul
- add context rule
- save preference
- create engineering follow-up

Approval UI should show:

- what Jamie saw
- why Jamie thinks it matters
- what will change
- what could go wrong
- how to undo it

## 6. Apply

Apply should use existing guarded update paths.

Important rule:

> Jamie proposes. The platform applies after approval.

Apply should:

- validate freshness before mutation
- checkpoint old content
- write through existing update APIs
- record who approved
- record what evidence justified it
- record the before and after artifact
- monitor whether the score improves afterward

## Implementation Roadmap

### Phase 1 - Plan And Contracts

Status note:

> The V2 Jaime-owned contract is implemented through `agent_improvement_proposals`, `agent_improvement_candidates`, `agent_improvement_jobs`, and `agent_learning_experiments`. The broader unified observation and Brain/platform routing contract remains future work.

Goal:

> Define the durable contract before adding UI or jobs.

Files:

- `supabase/migrations/[new]_agent_learning_loop_observations.sql`
- `packages/api-shared/src/types/[new-agent-learning-loop-contracts].ts`
- `packages/api-shared/src/index.ts`
- `.docs/plans/suggestion-improvement-layer.md`
- `.docs/plans/agent-learning-loops.md`

Changes:

- Add a typed observation model for human and platform signals.
- Add normalized score component types.
- Add classification enums.
- Add proposal type enums.
- Add proposal status lifecycle.
- Add ownership routing: `user_owned`, `org_owned`, `agent_owned`, `platform_owned`.
- Add platform signal and platform cluster contracts.
- Add an Agent Upgrade Experiment contract for baseline, treatment, primary metric, guardrails, checkpoint, and keep/revert/revise result.
- Link this plan from `SIL-R04`, `SIL-R05`, `SIL-R06`, `SIL-R10`, and `SIL-R11` in the suggestion layer plan.

Contract:

- Observation target types: `message`, `agent_run`, `tool_call`, `mission`, `mission_step`, `space_item`, `artifact`, `final_output`.
- Observation families: `human_feedback`, `tool_signal`, `context_signal`, `completion_signal`, `acceptance_signal`, `rework_signal`, `runtime_signal`.
- Proposal types: `skill`, `agent_instruction`, `tool_guidance`, `context_rule`, `preference`, `workflow`, `product_fix`.
- Experiment results: `keep`, `revert`, `revise`, `inconclusive`.
- Platform signal lifecycle: `local_signal`, `clustered`, `triaged`, `accepted`, `fixed`, `closed`, `dismissed`.

Tests:

- Shared type tests for classification and score parsing.
- Migration shape check if the repo has a migration test harness for this area.

### Phase 2 - Message And Mission Feedback UX

Goal:

> Make user feedback easy and attach it to the exact work being judged.

Files:

- `apps/web/src/features/mission-control/components/dialogs/MissionRatingStrip.tsx`
- `apps/web/src/features/studio/components/chat/*`
- `apps/web/src/features/team*/components/chat/*`
- `apps/api/src/modules/missions/controllers/missions-feedback.controller.ts`
- `apps/api/src/modules/missions/services/missions-user-operations.service.ts`
- `apps/api/src/modules/missions/repositories/missions-user-operations.repository.ts`
- `apps/api/src/modules/missions/dto/mission-core.dto.ts`
- `apps/api/src/modules/[new-agent-learning-loop]/*`

Changes:

- Extend feedback UI from mission-level rating into reusable message/output feedback.
- Add thumbs up/down with chip selection and optional text.
- Attach feedback to the most specific available target.
- Preserve the existing `evaluation_drift` mission path while adding the broader observation path.

Contract:

- Existing mission rating keeps `thumbs_up`, `rating`, and `feedback`.
- New feedback accepts target metadata plus selected chips.
- Feedback text remains bounded and user-owned.

Tests:

- Mounted component tests for feedback open, chip selection, send, disabled state, and keyboard behavior.
- API tests for valid target, invalid target, missing rating/thumb, org scope, and duplicate/update behavior.

### Phase 3 - Platform Signal Capture

Goal:

> Turn the agent work trail into measurable platform evidence.

Files:

- `apps/agent-api/src/modules/chat/services/skill-recommendation-event-recorder.service.ts`
- `apps/agent-api/src/modules/chat/repositories/chat-runtime.repository.ts`
- `apps/agent-api/src/modules/chat/services/openclaw-stream-tool.service.ts`
- `apps/agent-api/src/modules/artifacts/services/*`
- `apps/openclaw/src/gateway/*`
- `apps/api/src/modules/[new-agent-learning-loop]/*`

Changes:

- Record tool success/failure counts.
- Record schema/preflight failures.
- Record repeated same-payload failures.
- Record corrected retry after failure.
- Record completion and interruption outcomes.
- Record source-fidelity markers when expected source use can be detected.

Contract:

- Store raw evidence separately from computed score.
- Store evidence fingerprints, not full private prompt/response payloads by default.
- Keep trace ids so Jamie jobs can hydrate bounded/redacted evidence only when needed.

Tests:

- Unit tests for tool score component calculation.
- Regression tests for repeated same-payload failure detection.
- Tests that missing evidence is `unknown`, not `0`.

### Phase 4 - Scoring And Ranking

Goal:

> Decide which patterns are worth Jamie attention.

Files:

- `apps/api/src/modules/[new-agent-learning-loop]/services/[new-score-service].ts`
- `apps/api/src/modules/[new-agent-learning-loop]/services/[new-ranking-service].ts`
- `apps/api/src/modules/[new-agent-learning-loop]/repositories/[new-repository].ts`
- `apps/api/src/modules/skill-recommendations/services/skill-recommendation-detection.service.ts`

Changes:

- Compute run quality score from known component scores.
- Re-normalize weights across known values.
- Create candidate groups from repeated evidence fingerprints.
- Score candidates by impact, recurrence, confidence, freshness, scope fit, and risk.
- Route candidates to user/org/agent/platform ownership before proposal drafting.
- Prevent platform-owned candidates from becoming user-approval cards.
- Keep skill recommendation detection compatible, then decide whether to merge it into the broader candidate system or keep it as a specialized input.

Contract:

- Run score must include component breakdowns.
- Candidate priority must keep factors visible.
- Ranking cannot produce a proposal without a target and classification.
- Platform-owned candidates must produce platform signals/clusters, not direct agent upgrade proposals.

Tests:

- Score math tests.
- Weight re-normalization tests.
- Candidate grouping tests.
- Freshness decay tests.
- Risk penalty tests.
- Ownership routing tests.

### Phase 4.5 - Platform Signal Aggregation And Engineering Intake

Goal:

> Turn platform-owned findings from many org Jamies into one deduped engineering/product queue.

Files:

- `apps/api/src/modules/[new-agent-learning-loop]/services/[new-platform-signal-service].ts`
- `apps/api/src/modules/[new-agent-learning-loop]/services/[new-platform-cluster-service].ts`
- `apps/api/src/modules/[new-agent-learning-loop]/repositories/[new-repository].ts`
- `apps/api/src/modules/[new-agent-learning-loop]/controllers/[new-platform-controller].ts`
- `apps/web/src/features/settings/components/settings-content/*`
- `apps/web/src/features/home/components/cards/*`

Changes:

- Store local platform signals emitted by org Jamies.
- Deduplicate signals into platform clusters by classification, tool/action, schema/preflight fingerprint, runtime surface, and app surface.
- Compute affected org count, affected run count, severity, confidence, trend, and last seen.
- Create one engineering/product queue item per cluster after threshold.
- Keep representative evidence redacted by default.
- Track owner area, status, release/fix link, and measurement result.

Contract:

- Org users do not see cross-org evidence.
- Engineering sees aggregated/redacted evidence.
- A platform cluster cannot mutate code or schemas by itself.
- A platform fix must be implemented through the normal platform engineering path, then measured as a platform fix experiment.

Tests:

- Signal dedupe tests.
- Cross-org aggregation privacy tests.
- Threshold tests.
- Cluster status lifecycle tests.
- Engineering queue creation tests.

### Phase 5 - Jamie Classification And Proposal Drafting

Goal:

> Convert high-priority candidates into reviewable Agent Upgrade Proposals.

Files:

- `apps/api/src/modules/skill-recommendations/services/skill-recommendation-jaime.service.ts`
- `apps/api/src/modules/[new-agent-learning-loop]/services/[new-jaime-proposal-service].ts`
- `apps/api/src/modules/[new-agent-learning-loop]/services/[new-proposal-quality-gate].ts`
- `apps/api/src/modules/[new-agent-learning-loop]/controllers/[new-controller].ts`

Changes:

- Reuse the Jamie review pattern from skill recommendations.
- Draft proposal JSON for skill, instruction, tool guidance, context rule, preference, workflow, and product fix proposals.
- Add quality gates for evidence freshness, confidence, target artifact, risk, and rollback/checkpoint.
- Route platform-owned candidates to platform clusters instead of Jamie user proposals.
- Hold ambiguous candidates instead of forcing low-confidence recommendations.

Contract:

- Jamie returns structured proposals, not free-form advice.
- Proposal contains evidence, classification, exact target, expected effect, risk, and approval mode.
- Product-fix proposals route to engineering/product follow-up instead of applying agent mutations.
- User/org-facing proposals only target artifacts the user/org is allowed to approve.

Tests:

- Strict proposal schema validation.
- Classification routing tests.
- Ambiguous evidence hold tests.
- Product-fix no-mutation tests.

### Phase 6 - Approval And Apply

Goal:

> Let users approve changes safely.

Files:

- `apps/web/src/features/home/components/cards/SkillRecommendationsCard.tsx`
- `apps/web/src/features/settings/components/settings-content/SkillsPageContent.tsx`
- `apps/web/src/features/team*/components/*`
- `apps/api/src/modules/skill-recommendations/controllers/skill-recommendations.controller.ts`
- `apps/api/src/modules/[new-agent-learning-loop]/controllers/[new-controller].ts`
- existing guarded apply paths for `update_agent`, `create_agent_skill`, and `update_agent_skill`

Changes:

- Add one review surface for Agent Upgrade Proposals.
- Show what Jamie saw, what will change, why, risk, and rollback.
- Let approvers choose whether the change is permanent now or an experiment that must be measured before keeping.
- Show platform-owned issues as reported/followed items only when user-visible; do not show "approve schema change" to customers.
- Apply skill changes through existing skill creation/update paths.
- Apply agent instruction changes only through guarded agent update paths.
- Add checkpoint records before mutation.
- Record approver, timestamp, evidence ids, before artifact, and after artifact.

Contract:

- Jamie proposes; the platform applies only after approval.
- Approval validates freshness before mutation.
- No proposal can silently mutate role, identity, soul, tools, or skills.
- Platform-owned fixes are approved by platform/product/engineering, not by customer org admins.

Tests:

- Approval authorization tests.
- Freshness validation tests.
- Checkpoint write tests.
- Apply success/failure tests by proposal type.

### Phase 7 - Post-Approval Measurement

Goal:

> Check whether approved upgrades actually made agents better.

Files:

- `apps/api/src/modules/[new-agent-learning-loop]/services/[new-measurement-service].ts`
- `apps/api/src/modules/[new-agent-learning-loop]/repositories/[new-repository].ts`
- `apps/web/src/features/home/components/cards/*`
- `.docs/plans/suggestion-improvement-layer.md`

Changes:

- Define baseline window before approval.
- Define measurement window after approval.
- Compare run quality, acceptance, correction, repeat failure, and rating trend.
- Mark experiments as `keep`, `revert`, `revise`, or `inconclusive`.
- Measure platform fix clusters before and after platform release.
- Feed outcome back into future confidence.

Contract:

- Closed-loop measurement uses component scores, not only one aggregate score.
- A worsened proposal should be reversible through checkpoint or queued for revision.
- The primary metric decides the experiment result only when guardrails stay within allowed bounds.
- Platform fix experiments decide rollout success by cluster-level metric improvement and guardrail stability.

Tests:

- Baseline/window calculation tests.
- Improvement classification tests.
- Confidence update tests.

## Data And Contract Map

- Input: human feedback, tool events, run status, trace ids, mission ratings, artifact acceptance, correction/rework signals, local platform signals.
- Validation: target type/id, org/user scope, chip enum, score component bounds, proposal schema, ownership route, platform signal fingerprint.
- AuthZ/AuthN: keep existing user/org guards; proposal approval should require owner/admin-level permission for shared agent changes.
- Storage: new observation/candidate/proposal/apply/measurement/platform-signal/platform-cluster tables, plus existing `evaluation_drift` and `skill_recommendation_*` tables.
- Output: feedback acknowledgements, proposal cards, review details, approval/apply results, platform issue reported states, engineering queue items, post-approval measurement status.
- Side effects: optional Jamie review job, guarded agent/skill/tool/context updates after approval, platform cluster creation for engineering/product intake.
- Idempotency: dedupe observations by event/trace/target fingerprint; dedupe candidates by org, agent, classification, and evidence fingerprint; dedupe platform signals by classification/surface/fingerprint; prevent duplicate active jobs per candidate or cluster.
- Experiment ledger: record baseline, treatment, primary metric, guardrails, decision, and rollback checkpoint for each approved upgrade.

## Test Plan

- Unit: score formulas, ranking, classification routing, proposal schema validation, freshness/risk gates.
- Integration: feedback endpoint writes, observation ingestion, candidate creation, platform signal clustering, Jamie proposal job lifecycle, approval/apply flow.
- Frontend: message feedback popover, mission feedback compatibility, proposal review card, platform issue reported state, approval states.
- Regression: existing skill recommendation opt-in, candidate detection, Home card, and skill conversion keep working.
- Manual: run one chat with tool success, one chat with tool error/recovery, one mission rating, one thumbs-down chip flow, one approved proposal, one platform-owned cluster.

## Rollout And Verification

1. Ship contracts and storage behind no UI.
2. Mirror existing mission feedback into observations.
3. Add message-level feedback for one surface first.
4. Add platform scoring in passive mode.
5. Route platform-owned findings into local platform signals only.
6. Add platform signal aggregation and engineering/product queue in internal-only mode.
7. Create Jamie proposals in review-only mode for user/org/agent-owned findings.
8. Enable one approval/apply type first, likely skill proposal or preference proposal.
9. Add instruction/tool/context proposals after approval and checkpointing are proven.
10. Add post-approval measurement.
11. Add keep/revert/revise experiment decisions once enough post-approval measurements exist.

Verification:

- Observation rows exist for feedback and platform events.
- Score components are visible and explainable.
- Candidate priority factors are visible.
- Platform-owned candidates create clustered platform issues instead of customer approval cards.
- Jamie proposals include evidence and exact targets.
- Approvals write audit/checkpoint data.
- Existing skill recommendations still work.
- Post-approval measurements compare before/after windows.

Rollback:

- Disable new observation ingestion by feature flag or settings gate.
- Keep existing mission rating and skill recommendation flows intact.
- Use checkpoint records to restore any approved agent/skill content change.

## Missing Evidence

- Live Vibey MCP was not exposed in this session, so accessible Brain contents, Brain scopes, agents, and permissions could not be refreshed directly.
- Brain-side repo evidence exists through Company Cortex signals/objects, Brain lint results, and Brain cross-suggestions, but there is no unified Brain improvement proposal lane yet.
- Hidden route-outs are persisted, but the internal product/platform/Brain/workflow review queue is not implemented.
- Current chat message data model and all chat surfaces need full source review before choosing the first message-level feedback target.
- Exact customer-facing measurement copy and richer diff editing defaults are not decided yet.
- Platform queue destination is not chosen yet. The smallest experiment is an internal API/admin surface first; later it can sync to GitHub, Linear, Jira, or another engineering tracker.

## Open Questions

- What are the first three feedback chips for thumbs down?
- Should thumbs up collect chips too, or only optional text?
- What is the first target for message-level feedback: agent messages, final answers, or mission outputs?
- Should run quality be visible to users, or only used by Jamie?
- What confidence threshold should allow Jamie to propose role or soul changes?
- What approval level should be required for system-owned agents?
- What threshold turns local platform signals into a platform engineering item?
- Which platform clusters should customers see as "reported," and which should stay internal?
- Which engineering tracker should own platform cluster handoff after the internal queue is proven?
