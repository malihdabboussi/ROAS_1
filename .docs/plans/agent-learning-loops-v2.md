# Agent Learning Loops V2

Last Modified: 2026-06-28
Status: Full integration implemented in the skill recommendation pipeline
Owner: Jaime (`agent_key`: `hr`)

## Evidence Check - 2026-06-28

Repo and production schema evidence confirm the first Agent Improvements lane is implemented for both skills and agent files:

- `agent_improvement_proposals`, `agent_improvement_candidates`, `agent_improvement_jobs`, and `agent_learning_experiments` exist in production.
- The implemented proposal kinds are `skill_create`, `skill_update`, `skill_resource_update`, `agent_file_update`, and hidden `route_out`.
- Approved skill and agent-file changes create a checkpoint before apply.
- Experiments evaluate post-change evidence and end as `keep`, `revise`, `revert`, or `inconclusive`.
- Agent-turn feedback, skill recommendation events, traces, activity, and mission logs are part of the Jaime evidence collector.

Brain-side evidence also exists, but it is a separate lane today:

- Atlas Company Cortex signals and objects exist for Company Brain review.
- Brain lint results and Brain cross-suggestions have repo/API/storage primitives.
- These Brain surfaces are not yet unified into the customer-visible Agent Improvements proposal lane.

Live Vibey MCP Brain access was not available in this session, so accessible Brain contents, Brain scopes, and agent permissions were not refreshed directly.

## Execution Status - 2026-06-24

Implemented:

- Core Agent Learning Loop policy service for classification, ranking, proposal quality, experiment decisions, artifact locks, and conflict handling.
- Customer-visible recommendation guard so system-agent events do not become normal skill recommendations.
- Jaime proposal contract now supports `skill_create`, `skill_update`, `skill_resource_update`, `agent_file_update`, and hidden `route_out` proposals.
- Platform/system/unsupported issues persist as route-outs and never show as customer-visible recommendations.
- Persistent recommendation columns now store proposal kind, target artifact, route-out type, artifact lock, priority score, proposed patch, quality failures, apply checkpoint, and experiment id.
- `agent_learning_experiments` stores running/completed experiment state, baseline/current metrics, qualifying event counts, and keep/revise/revert/inconclusive decisions.
- Pending proposals for the same artifact are patched instead of duplicated.
- Running experiments lock the artifact from another pending proposal.
- Approved proposals apply through guarded agent/skill paths after a checkpoint is created.
- Checkpoints now snapshot agent definitions, skills, and skill resources.
- Experiment evaluation uses post-change events and policy thresholds; `revert` restores the checkpoint.
- The Home Agent Improvements card shows customer-visible proposals, applies ready proposals, evaluates running experiments, and dismisses proposals.
- Jaime readiness instructions for `ROLE.md`, `skill-creator`, and `agent-builder`, with a migration for DB-backed HR artifacts.

Still outside this integration:

- A richer diff editor for agent-file/skill updates. The current approval surface is the Home card plus backend proposed patch.
- A dedicated internal product queue UI for hidden route-outs. Route-outs are persisted but not customer-visible.
- A separate broad historical replay batch runner. The current implementation already hydrates Jaime evidence from `vb_agent_traces` and evaluates experiments from recorded post-change events.
- A unified Brain improvement proposal lane. Company Cortex, Brain lint, and Brain cross-suggestions exist separately from Agent Improvements.

## 1. Scope

Agent Learning Loops is Jaime's system for improving agents from real work.

Jaime owns only:

- Agent files: `ROLE.md`, `IDENTITY.md`, `SOUL.md`, `name`, `role`
- Agent skills: `SKILL.md`, skill metadata, skill resources

Jaime does not own:

- Brain, Atlas, memories, or context knowledge
- Loop, workflows, or automations
- Platform tool schemas, preflight, runtime errors, or infrastructure
- Product UI, backend bugs, or permission bugs
- System agents or official/system skills in a customer-visible approval flow
- Cross-org automatic changes

Rule: if the fix is not an agent-file or skill change, Jaime routes it out.

System-owned rule: if the target is a platform system agent or official/system skill, the user never sees a recommendation. Jaime routes it to an internal Vibey review path.

Name source of truth:

- Production `agent_definitions` uses `agent_key = 'hr'`.
- Production `IDENTITY.md` names the agent `Jaime`.
- Use `Jaime` in implementation docs, skills, prompts, and UI unless a separate rename migration changes the source of truth.

## 2. Mental Model

Jaime is a reviewer for agent operating code.

Every Jaime proposal answers:

- What happened?
- Which agent or skill artifact should change?
- What exact change is proposed?
- Why should it improve future work?
- How will success be measured?
- What would make us revert?

No change applies itself. A human approves first.

## 3. Existing Foundation

The current skill recommendation system is the V1 seed.

It already:

- Records repeated no-skill work
- Groups similar events by organization, agent, prompt fingerprint, and tool signature
- Sends bounded evidence to Jaime
- Asks Jaime to recommend or skip
- Creates a reviewable skill proposal
- Requires human review before skill creation

V2 keeps that path working and expands the proposal surface to skill updates, skill resources, and agent-file updates.

## 4. Phase 0: Jaime Readiness

Before Agent Learning Loops reviews real agents, Jaime must be upgraded first.

This is a builder-controlled bootstrap step, not autonomous self-upgrade.

Readiness work:

- Update Jaime's `ROLE.md`, `IDENTITY.md`, and `SOUL.md` so her responsibility is clear: review and propose agent-file and skill upgrades, not mutate agents directly.
- Update Jaime's relevant skills so she can classify evidence, pick the right target artifact, produce structured proposals, route out non-Jaime issues, and reason about revise experiments.
- Use `context-eng` as the instruction quality bar: explain why rules exist, keep instructions lean, use one term consistently, avoid overfitting, include concrete examples, and re-read with fresh eyes.
- Add examples inside Jaime's skill/reference material for `skill_create`, `skill_update`, `skill_resource_update`, `agent_file_update`, `route_out`, and `revise`.
- Test Jaime against past traces before enabling real proposals.

Readiness acceptance:

- Jaime can choose the correct target artifact in sample cases.
- Jaime can route out platform, Brain, workflow, and product issues without proposing agent changes.
- Jaime can output proposal JSON that matches the required schema.
- Jaime can explain why a revise follow-up is better than keep or revert.

## 5. Loop Shape

| Step | Purpose | Output |
| --- | --- | --- |
| Observe | Collect evidence from real agent work | Raw events |
| Rank | Decide what matters first | Prioritized candidates |
| Classify | Decide what kind of issue it is | Jaime type or route-out type |
| Propose | Draft one concrete change | Proposal with target artifact |
| Approve | Let a human review/edit/dismiss | Approved or dismissed proposal |
| Apply and measure | Apply safely and check result | Keep, revise, revert, or inconclusive |

Every step uses the same gate: can this be improved by changing an agent file or skill?

## 6. Observe

Valid Jaime signals:

- Same agent repeats the same work without a skill.
- Skill is used but keeps needing corrections.
- Skill works, but should be clearer, safer, or more reusable.
- User feedback points to agent behavior or skill quality.
- Good agent work should become repeatable.
- Agent repeatedly ignores role, identity, soul, or boundaries.
- Agent repeatedly needs the same user instruction before doing good work.

Invalid Jaime signals:

- Tool schema is wrong.
- Tool transport failed.
- Runtime error handling is weak.
- Platform endpoint is broken.
- Workflow should exist.
- Brain context is missing.
- Product UI is confusing.

Invalid signals can be useful, but only as route-out findings.

## 7. Rank

Ranking answers: should Jaime spend review time on this?

```text
priority =
  recurrence
  * user_impact
  * confidence
  * freshness
  * scope_fit
  - risk
```

| Factor | Meaning |
| --- | --- |
| `recurrence` | How often the pattern appears |
| `user_impact` | How much it affects the user outcome |
| `confidence` | How clear the evidence is |
| `freshness` | Whether the pattern is still happening |
| `scope_fit` | Whether agent files or skills can fix it |
| `risk` | Chance the change makes behavior worse |

`scope_fit` is a hard gate. If the fix is not in Jaime's lane, the score does not matter.

## 8. Classify

Jaime candidate types:

| Type | Meaning | Target |
| --- | --- | --- |
| `skill_create` | Repeated work should become a new skill | New `skill_key` |
| `skill_update` | Existing skill needs better instructions | Existing `skill_key` |
| `skill_resource_update` | Skill needs better examples/templates/references | Skill resource path |
| `agent_file_update` | Agent needs better role/identity/soul/name/role | Agent file or field |
| `no_action` | Evidence is weak or no change is needed | None |
| `route_out` | Real issue, wrong lane | Route-out type |

Route-out types:

| Type | Meaning |
| --- | --- |
| `platform_tool_contract` | Schema, preflight, action docs, or tool contract issue |
| `platform_runtime` | Runtime, circuit breaker, or infrastructure issue |
| `product_bug` | UI, API, permission, or product behavior issue |
| `brain_context` | Brain or memory issue |
| `workflow_automation` | Workflow or automation issue |
| `system_owned_artifact` | Platform system agent or official/system skill issue |

Route-out findings are not Jaime upgrade cards.

Target artifact rubric:

| Evidence pattern | Target |
| --- | --- |
| Agent repeats a procedure that should be reusable | New skill |
| Existing skill is used but misses steps, examples, constraints, or edge cases | Existing skill |
| Skill needs examples, templates, or reference material more than new instructions | Skill resource |
| Agent misunderstands what work belongs to it | `ROLE.md` |
| Agent's identity, title, or positioning is confusing | `IDENTITY.md` |
| Agent's judgment, tone, boundaries, or operating philosophy is wrong | `SOUL.md` |
| Agent's displayed name or role label is wrong | `name` or `role` |
| Fix targets a platform system agent or official/system skill | Internal `route_out` |
| Fix requires platform, Brain, workflow, or product changes | `route_out` |

Default choice:

- Prefer skill changes for repeatable procedure problems.
- Prefer agent-file changes for repeated responsibility, identity, judgment, or boundary problems.
- Prefer route-out when the target artifact is not clearly owned by Jaime.

## 9. Propose

Every proposal targets one artifact.

```text
proposal_type:
target_agent_key:
target_artifact:
evidence_summary:
current_problem:
proposed_change:
expected_behavior_change:
primary_metric:
guardrail_metrics:
risk_level:
approval_required:
checkpoint_required:
route_out_reason:
```

Allowed targets:

- `ROLE.md`
- `IDENTITY.md`
- `SOUL.md`
- `name`
- `role`
- Existing `skill_key`
- New `skill_key`
- Skill resource path

Rules:

- One proposal, one artifact.
- Evidence must come from real work.
- Proposed change must be shown as a draft or diff.
- Metric and guardrails are required.
- Proposal must say when to keep, revise, or revert.

Proposal quality gate:

- The proposed instruction change must explain why the behavior matters, not only what to do.
- The draft must be lean enough to fit naturally inside the target file or skill.
- Terms must be consistent across the proposal.
- The proposal must avoid overfitting to one trace unless the change is explicitly narrow.
- Skill proposals should include at least two examples when examples would make the behavior clearer.
- Route-out proposals must explain why the issue cannot be solved through agent files or skills.

This quality gate should be included in Jaime's own skill/reference material so the output shape is learned, not only validated after the fact.

## 10. Approve

Review surface:

- Target agent
- Target artifact
- Evidence summary
- Proposed diff or draft
- Expected improvement
- Metric to watch
- Risk
- Approve, edit, dismiss

Rules:

- New skills reuse the existing skill review flow where possible.
- Skill updates use an editable skill diff.
- Agent-file updates use an editable file diff.
- Organization-owned agents can be approved by an org owner, org admin, or explicit agent manager with agent/skill management permission.
- System-owned agents and official/system skills do not enter this user approval surface.
- The reviewer job cannot approve its own proposal.
- Every applied change gets a checkpoint first.

Approval defaults:

- Skill create/update: org owner, org admin, or agent manager.
- Agent-file update: org owner or org admin by default; agent manager only when that role is explicitly allowed to edit identity files.
- System-agent or official/system-skill issue: internal route-out only; no customer-visible recommendation.
- Dismiss and edit require the same permission level as approve.

## 11. Apply And Measure

Lifecycle:

```text
proposed -> approved -> checkpointed -> applied -> measuring -> keep/revise/revert/inconclusive
```

Measurement asks:

- Did the repeated pattern happen less often?
- Did user ratings improve?
- Did corrections decrease?
- Did the skill get reused successfully?
- Did the agent stay inside its role better?
- Did any guardrail get worse?

Initial measurement window:

- Start measuring immediately after the approved change is applied.
- End the experiment after 14 days or 20 qualifying post-change events, whichever comes first.
- Require at least 5 qualifying post-change events before deciding keep, revise, or revert.
- If 14 days pass with fewer than 5 events, mark `inconclusive` or extend once when the original issue is high impact.

Initial decision thresholds:

| Result | Threshold |
| --- | --- |
| `keep` | Primary metric improves by at least 30%, guardrails do not worsen by more than 10%, and no strong negative user feedback appears |
| `revise` | Primary metric improves by 10-30%, or improves more but a guardrail worsens by 10-20%, or feedback points to a clearer narrower fix |
| `revert` | Primary metric worsens, a guardrail worsens by more than 20%, role violations increase, or trusted user/admin feedback says the change made the agent worse |
| `inconclusive` | Fewer than 5 qualifying events, mixed evidence, or confidence is too low to decide |

Past-trace calibration:

- Before production rollout, replay past traces through Jaime and compare suggestions against what humans would accept.
- Use that replay to tune the 14-day window, 20-event cap, 5-event minimum, and percentage thresholds.
- Do not treat the initial thresholds as permanent until the replay shows they produce useful decisions.

Revise trigger:

A `revise` result opens a new linked proposal only when measurement shows one of these:

- The original problem still exists, but is smaller.
- The approved change helped one metric but hurt a guardrail.
- The approved change created a narrower new problem.
- Post-change user feedback points to a clearer better version.

The follow-up proposal must connect back to the experiment:

```text
parent_experiment_id:
previous_change_summary:
measurement_summary:
why_keep_is_wrong:
why_revert_is_too_strong:
revision_reason:
new_proposed_change:
same_or_new_metric:
```

Simple rule: revise means do not keep this version as-is, but do not fully revert. Use the measurement results to propose a better version.

Conflict rules:

- Use one active pending proposal per organization, target agent, and target artifact.
- If new evidence arrives for the same artifact before approval, patch the existing pending proposal instead of creating another proposal.
- If an experiment is already running for an artifact, do not apply another proposal to that artifact.
- New evidence during a running experiment attaches to the experiment as measurement evidence or waits as a queued candidate.
- After the experiment closes, Jaime can create a follow-up proposal if the evidence still supports it.
- Apply proposals for the same artifact in order; do not run overlapping experiments on one skill or file.

## 12. Experiment Layer

The useful idea from autoresearch is disciplined experiments, not autonomous mutation.

Every Jaime experiment has:

- One target artifact
- One approved change
- One baseline
- One primary metric
- A few guardrails
- A fixed measurement window
- A keep, revise, revert, or inconclusive result

## 13. Multi-Organization Model

Rules:

- Observations are grouped by organization and target agent.
- Proposals are created for one organization and one target agent.
- One organization's proposal never changes another organization.
- Cross-org similarity can help internal ranking, not automatic application.
- Shared template improvements are outside V2 unless manually promoted through a separate admin/product process.

This keeps the system practical at scale: many small local proposals, not one global editor.

## 14. Feedback UX

Every agent message can support:

- Thumbs up
- Thumbs down
- Optional chips
- Optional free text

Jaime-useful chips:

- Good skill fit
- Missing skill
- Wrong behavior
- Ignored role
- Needed correction
- Great reusable answer
- Too generic
- Not this agent's job

Only feedback tied to agent behavior or skill quality enters Jaime's candidate stream.

## 15. Data Direction

Use the current skill recommendation tables as the Agent Learning Loop proposal pipeline.

Implemented model:

- `skill_recommendation_events`
- `skill_recommendation_candidates`
- `skill_recommendation_jobs`
- `skill_recommendations`
- `agent_learning_experiments`

Each recommendation stores organization id, target agent key, proposal type, target artifact, evidence ids, proposed patch, visibility, route-out type, checkpoint id, experiment id, and lifecycle status.

The model includes:

- `artifact_lock_key`: organization, target agent, and target artifact.
- Pending proposal patching through the artifact lock.
- Running experiment lockout through the artifact lock.
- `started_at`, `ends_at`, `qualifying_events`, `baseline_metrics`, `current_metrics`, `decision`, and `decision_reasons` on `agent_learning_experiments`.

## 16. Implementation Plan

Integrated execution path:

- Align docs and runtime-facing references to the production source of truth: `agent_key = 'hr'`, name `Jaime`.
- Upgrade Jaime's own files and skills for Agent Learning Loops.
- Add the artifact-selection rubric and proposal-quality gate to Jaime's skill/reference material.
- Add sample outputs for skill create, skill update, skill resource update, agent-file update, route out, and revise.
- Define Jaime's scope as agent files and skills only.
- Add proposal types and route-out types.
- Add the strict proposal schema.
- Keep current skill recommendations working.
- Keep repeated no-skill events.
- Add thumbs up/down feedback events.
- Add skill-quality and agent-behavior categories.
- Filter out platform, Brain, workflow, product, and system-owned artifact issues before customer-visible Jaime review.
- Add the priority formula.
- Use `scope_fit` as a hard gate.
- Classify every candidate before proposal generation.
- Use the artifact-selection rubric to pick the right target.
- Extend Jaime from skill creation to skill updates and agent-file updates.
- Require one target artifact per proposal.
- Require metric, guardrails, risk, and checkpoint requirement.
- Apply the proposal-quality gate before showing a proposal to users.
- Keep strict JSON output.
- Add an Agent Improvements review surface.
- Show target artifact and proposed diff.
- Allow approve, edit, and dismiss.
- Reuse the skill creation flow for new skills.
- Do not show system-agent or official/system-skill recommendations to users.
- Checkpoint before applying.
- Apply through guarded agent and skill write paths.
- Start a measurement window.
- Mark each result as keep, revise, revert, or inconclusive.
- Prevent overlapping experiments on the same target artifact.
- Patch pending proposals for the same target artifact instead of creating duplicates.
- Use past-trace replay to tune measurement thresholds.

## 17. Acceptance Criteria

V2 is correct when:

- The plan uses the DB-backed name `Jaime` for `agent_key = 'hr'`.
- Jaime readiness is complete before live proposal generation.
- Jaime proposals only target agent files or skills.
- Non-Jaime issues are routed out.
- System agents and official/system skills never create customer-visible recommendations.
- Every proposal has one target artifact.
- Every proposal passes the instruction-quality gate before review.
- Every applied change is human-approved.
- Approval permissions are explicit for org-owned artifacts; system-owned artifacts route internally.
- Every applied change has a checkpoint.
- Every applied change has a measurement window.
- Keep, revise, revert, and inconclusive decisions use recorded thresholds.
- Pending duplicate proposals patch the existing proposal for the same artifact.
- Running experiments lock the target artifact until closed.
- Existing skill recommendations still work.
- The plan is readable as one clean system.
