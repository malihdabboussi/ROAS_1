# Suggestion And Improvement Layer

Last Updated: 2026-06-28

## City Model

Think of Vibey as a city. The main product buildings are:

| Building | Building Manager | What It Owns |
| --- | --- | --- |
| Spaces | Vibey | Tasks, docs, channels, campaigns, team activity, customer-facing work surfaces. |
| Brain | Atlas | User Brain, Agent Brain, Company Brain, Customer Brain, extraction, curation, lint, dreams, and durable knowledge. |
| Agents & Skills | Jaime | Agent definitions, agent behavior, skills, skill recommendations, hiring/firing, and agent improvement. |
| Flows | Loop | Repeatable workflows, automations, scheduled work, and workflow promotion. |
| Suggestion Layer | Cross-building planner | Watches traffic between buildings, finds missing roads, and proposes what should improve next. |

The old version of this document was too much of an implementation action plan. This document is the road map: what roads already exist between the buildings, how mature each road is, what traffic is moving today, and what roads still need to be paved.

## Maturity Scale

| Level | Meaning |
| --- | --- |
| 0 - Not designed | The product idea exists, but there is no clear system shape. |
| 1 - Concept | We know the road should exist, but it is not implemented. |
| 2 - Foundation | Tables, tools, jobs, or UI surfaces exist, but the road is not productized end to end. |
| 3 - Working narrow road | A real path works for one domain or one feature, but it is not generalized. |
| 4 - Productized road | Users can use the road reliably, but it is mostly reactive or lacks learning loops. |
| 5 - Proactive loop | The platform observes, reduces to the right owner/root cause, proposes, gets approval, applies, measures improvement, and captures what was learned. |

Percentages in this doc are directional product maturity, not engineering estimates.

## Current Implementation Snapshot

As of 2026-06-28, the first real Suggestion Layer lane is no longer skill-only.

- Jaime Agent Improvements now use the existing skill recommendation entrypoint, but the storage and product concept are broader: `agent_improvement_proposals`, `agent_improvement_candidates`, `agent_improvement_jobs`, and `agent_learning_experiments`.
- Customer-visible Jaime proposals can target `skill_create`, `skill_update`, `skill_resource_update`, and `agent_file_update` for `ROLE.md`, `IDENTITY.md`, and `SOUL.md`.
- Non-Jaime issues become hidden `route_out` proposals instead of customer approval cards.
- Applying a customer-visible proposal creates an agent checkpoint, writes through guarded agent/skill paths, starts an experiment, and can later evaluate to `keep`, `revise`, `revert`, or `inconclusive`.
- Human thumbs/tags/text feedback is captured in `agent_turn_feedback` and feeds the agent-learning evidence lane.
- Atlas already proposes Company Cortex signals through `company_cortex_signals`; users can approve/reject those signals, and approval enqueues Company Cortex formation into durable objects.
- Brain already has quality primitives such as `ns_brain_lint_results` and `brain_cross_suggestions`, but they are not yet one unified Brain-improvement proposal lane.
- Production schema check confirmed the relevant Agent Improvement, Dream Ops, Company Cortex, Brain lint, and Brain cross-suggestion tables exist. Live Vibey MCP Brain access was not available in this Codex session, so accessible Brain contents and permissions were not refreshed.

Canonical loop:

1. Observe real work and feedback.
2. Reduce the signal to the correct owner and root cause.
3. Propose the smallest repeatable change.
4. Get human approval before mutation.
5. Apply through the owner building's guarded path.
6. Measure the outcome.
7. Keep, revise, revert, or route out.
8. Capture the lesson so future suggestions get smarter.

## First-Principles Signal Architecture

The next version should not be one giant extractor that reads the whole app.

The stronger model is a Sentry-like improvement signal layer:

> Product systems emit small structured signals at stable boundaries. The Suggestion Layer groups those signals, classifies ownership, and only creates a recommendation when evidence is strong enough.

This keeps the system broad without making it magical or unsafe.

### Stable Signal Boundaries

No matter what Vibey builds later, most work still passes through a limited set of boundaries:

| Boundary | Signal Examples | Why It Matters |
| --- | --- | --- |
| User judgment | thumbs, tags, free-text feedback, approve, reject, dismiss, edit after generation | Shows what the user accepted or corrected. |
| Agent work | turn completed, final output created, skill used, skill missing, repeated correction, route-out | Shows whether the agent or skill improved the work. |
| Brain/context | Brain search used, context missing, stale knowledge, duplicate knowledge, Company Cortex signal, Brain lint result | Shows whether Atlas or Brain quality is the fix owner. |
| Tools/platform | tool failed, schema failed, preflight blocked, runtime circuit broke, retry recovered, generated docs drifted | Shows whether this is a Vibey-owned platform problem. |
| Spaces/workflows | task completed, mission rated, artifact accepted, repeated manual steps, workflow paused or failed | Shows whether Loop or Spaces should suggest a workflow or process fix. |
| Output lifecycle | output generated, edited, exported, attached, approved, rejected, reused | Shows whether the result actually helped. |

Each boundary should emit the same basic question set:

- What happened?
- Where did it happen?
- Who or what was involved?
- What evidence supports it?
- How strong is the evidence?
- Who might own the fix?
- Is there a safe apply path?

### Signal To Issue Lifecycle

Signals are evidence. They are not recommendations.

The safe lifecycle is:

1. Raw signal: one event happened.
2. Cluster: similar signals accumulate until there is a pattern.
3. Ownership classification: the cluster becomes `workspace_owned`, `platform_owned`, `mixed`, or `unknown`.
4. Issue: the owner, confidence, and action path are clear enough to track.
5. Proposal: the issue has a concrete safe change that a human can review.
6. Apply and measure: the owning building applies through its guarded path and measures the result.

This means weak evidence can still be saved without becoming noise for the user.

### Ownership Model

The most important routing question is:

> Is this a workspace-owned improvement or a Vibey-owned platform improvement?

Workspace-owned means the fix belongs inside one user/org workspace:

- Jaime owns agent and skill changes.
- Atlas owns Brain quality and memory organization.
- Loop owns workflows and automations.
- Spaces owns work-surface behavior and task/campaign patterns.

Platform-owned means the customer should not be asked to approve the fix:

- tool schema or preflight mismatch
- runtime or transport failure
- product UI confusion
- generated docs or action contract drift
- permission or backend bug
- system-owned agent or official skill issue
- repeated failure across many orgs

Unknown means the system does not know yet. Unknown stays internal-only until more evidence accumulates.

### Routing Rule

Default posture:

> Shared evidence, separate ownership, guarded action.

The Suggestion Layer can see shared evidence, but it must not blend ownership.

- Do not send every bad signal straight to Jaime.
- Do not show platform-owned problems as customer approval cards.
- Do not let Atlas, Jaime, or Loop mutate each other's owned surfaces.
- Do not create a recommendation until owner, confidence, and safe action path are clear.
- Keep uncertain clusters internal until a human or stronger evidence confirms the owner.

This is safer than assuming every failure is an agent or skill problem.

### Why This Is The Next Best Implementation

The Jaime lane already proves the loop for skills and agent files.

The next best step is not to rebuild that lane. It is to add a neutral routing ledger above the lanes:

1. Existing Jaime route-outs, Brain signals, feedback, mission ratings, tool failures, and workflow patterns enter as raw signals.
2. Similar signals cluster by fingerprint, owner hints, org, agent, tool, Brain family, workflow, or affected surface.
3. Clusters stay `unknown` or internal-only until evidence crosses a threshold.
4. Clear workspace-owned clusters route to Jaime, Atlas, Loop, or Spaces.
5. Clear platform-owned clusters route to an internal Vibey improvement lane.
6. Human corrections teach the router whether ownership was right.

That gives Vibey a general improvement nervous system without exposing noisy or wrong recommendations to users.

### How We Measure Router Trust

The router is only trustworthy if it can be checked.

Track:

- owner accuracy: how often humans agree with the route
- wrong-owner dismissals: how often a suggestion is rejected because it belongs elsewhere
- acceptance rate: how often routed proposals are approved
- outcome improvement: whether approved fixes improve the measured signal
- unknown rate: how many clusters stay unresolved
- platform-repeat rate: how many platform-owned clusters appear across multiple orgs

The router should earn trust before it gets more automation.

## Current Roads Between Buildings

| Road | From -> To | What The Road Means | Current Traffic | Maturity | Building Manager | Missing Roadwork |
| --- | --- | --- | --- | --- | --- | --- |
| SIL-R01 | Onboarding connectors -> Brain | A new org connects sources like Gmail, Slack, Zoom, Jira, ClickUp, docs, or calls; Atlas extracts the first company/customer/team brain and produces an early report. | Brain ingestion, Atlas brain tools, customer/company/user/agent brain surfaces, import jobs. Full 24h org report flow is not confirmed as complete. | 2 / 5, about 35% | Atlas | Define the 24h onboarding brain report, connector coverage map, import quality scoring, and owner-facing recommendations. |
| SIL-R02 | Brain -> Agents | Agents can retrieve and use brain context while working. | Brain context tools, agent brain access, brain context UI indicators, agent/brain access controls. | 3 / 5, about 65% | Atlas + Jaime | Measure retrieval quality, expose why context was used, and feed bad/missing context into improvement suggestions. |
| SIL-R03 | Spaces -> Brain | Work activity in spaces, tasks, docs, channels, and campaigns becomes durable Company Brain knowledge. | Company Cortex foundation, shared Dream Ops `company_daily_dream`, proposed Company Cortex signals, human signal review, Company Cortex formation outbox, and company objects. | 3 / 5, about 55% | Vibey + Atlas | Expand beyond daily company signals into clearer onboarding and ongoing reports, unify Brain quality suggestions, and show what approved signals changed. |
| SIL-R04 | Agents -> Skill And Agent Improvement Proposals | Repeated or low-quality agent work becomes a Jaime-reviewed proposal for a new skill, skill update, skill resource update, or agent file update. | `skill_recommendation_events`, `agent_turn_feedback`, `agent_learning_dream`, `agent_improvement_proposals`, proposal kinds, hidden route-outs, Home review modal, guarded apply, checkpoints, and experiments. | 4 / 5, about 75% | Jaime | Add richer diff/edit review, broaden evidence replay/calibration, and keep the old skill label from hiding the broader Agent Improvement concept. |
| SIL-R05 | Missions -> Evaluation Drift -> Suggestions | Internal mission scoring and human ratings become signals for agent, skill, workflow, and brain improvements. | Mission quality evaluator, `evaluation_drift`, mission rating strip. | 2 / 5, about 35% | Jaime + Vibey | Turn scores and feedback into typed recommendation signals instead of storing them beside the mission only. |
| SIL-R06 | Agent Work -> Agent Improvement Proposals | Jaime reviews agent performance over time and proposes changes to skills, skill resources, or agent operating files. | Shared Dream Ops `agent_learning_dream`, Jaime Dream Ops tools, `agent_file_update`, route-outs, artifact locks, duplicate proposal patching, and running-experiment lockout. | 4 / 5, about 70% | Jaime | Keep Jaime's lane limited to agent files and skills, add internal UI for route-outs, and improve the review/edit experience for agent-file diffs. |
| SIL-R07 | Spaces + Agents -> Flow Suggestions | Repeated work patterns become Loop workflow proposals. | Spaces automations, action builder, Flow concepts, promotion-candidate references. | 2 / 5, about 25% | Loop + Vibey | Detect repeated step-by-step work from conversations/tasks, draft the workflow, simulate it, and ask for approval. |
| SIL-R08 | Brain -> Brain Quality Suggestions | Atlas finds stale, missing, duplicated, contradictory, or thin knowledge and suggests brain cleanup. | Brain lint actions/results, SK gaps, Company Cortex signal review, Brain cross-suggestions, company/customer brain tools. | 2 / 5, about 45% | Atlas | Convert lint results, gaps, and cross-suggestions into one owner-facing Brain improvement queue with severity, evidence, and safe apply paths. |
| SIL-R09 | Customer Signals -> Org/Agent Suggestions | Customer brain and customer activity suggest better positioning, account handling, agent behavior, or workflows. | Customer Brain tools and customer-related brain operations exist. | 2 / 5, about 25% | Atlas + Jaime | Connect customer intelligence to agent/workflow recommendations and show how it changes operating behavior. |
| SIL-R10 | Suggestions -> Approval -> Apply | A recommendation becomes an approved change through the right guarded path. | Jaime proposals apply through guarded skill/agent paths with checkpoints; Atlas Company Cortex signals have approve/reject review and formation outbox. | 3 / 5, about 60% | Jaime + Vibey | Generalize the approval contract across Jaime, Atlas, Loop, and platform route-outs without letting the Suggestion Layer mutate owned systems directly. |
| SIL-R11 | Approved Change -> Measurement | After an improvement is accepted, Vibey checks whether outcomes improved. | Agent Improvement proposals create `agent_learning_experiments` and can evaluate post-change events and feedback into `keep`, `revise`, `revert`, or `inconclusive`. | 3 / 5, about 45% | Suggestion Layer | Extend measurement beyond the Jaime lane to Brain signals, workflow suggestions, and ready-for-review outputs, then feed results back into confidence. |
| SIL-R12 | Proactive Workflow -> Ready For Review Output | The platform does the repeated work automatically and gives the user finished outputs for review, like four scripts ready in the morning. | Automations can run tasks, but suggestion-to-approved-workflow-to-ready-output is not built as one loop. | 1 / 5, about 10% | Loop + Vibey | Connect workflow suggestions to scheduled execution, review queues, and user approval of generated outputs. |

## Road Traffic Examples

### Example 1: First 24 Hours After Onboarding

1. User connects sources during onboarding.
2. Atlas ingests the available source data into the right brains.
3. Atlas produces a first company/customer/team brain report.
4. The Suggestion Layer identifies missing context, duplicated knowledge, early agent opportunities, and obvious workflows.
5. The owner sees a reviewable report with recommendations, not silent changes.

Current maturity: foundation only. The Brain building exists and Atlas has tools, but the complete 24h proactive report road is not yet a productized loop.

### Example 2: Repeated Agent Work Becomes A Skill Or Agent Change

1. A user repeatedly asks an agent to perform a similar task.
2. The system records lightweight events and users can add thumbs/tags/text feedback on completed turns.
3. Dream Ops runs an `agent_learning_dream` for the target agent when the window has evidence.
4. Jaime inspects the agent and evidence, then creates a proposal with Dream Ops tools.
5. The proposal targets one artifact: a new skill, existing skill, skill resource, or agent file.
6. The owner reviews it in Home, applies it, and the backend checkpoints first.
7. The experiment watches post-change evidence and decides `keep`, `revise`, `revert`, or `inconclusive`.

Current maturity: productized narrow road, about 75%. This is the closest existing example of the future Suggestion Layer, and it now covers both skills and agent-file changes.

### Example 3: Media Team Workflow Becomes Automation

1. A media team keeps asking agents to research, outline, write, and prepare scripts.
2. The Suggestion Layer detects the repeated operating pattern across conversations, tasks, and outputs.
3. Loop drafts the workflow from the actual step-by-step pattern.
4. Atlas identifies which brain context the workflow needs.
5. Jaime checks whether an agent or skill should be improved to run the workflow.
6. The owner approves the workflow.
7. The next morning, the platform shows four scripts ready for review.

Current maturity: mostly concept. Pieces exist in Spaces, Brain, Agents, and Automations, but the road between them is not paved.

## What The Suggestion Layer Actually Is

The Suggestion Layer is not another isolated building. It is the city planning layer for roads between buildings.

It should own:

- Road registry: a typed map of cross-building capabilities like the table above.
- Signal intake: a shared Sentry-like utility for improvement evidence from brain work, agent work, human work, customer work, missions, tasks, channels, tools, outputs, and flows.
- Signal ledger: raw signals that are useful evidence but are not yet recommendations.
- Cluster ledger: grouped signal patterns with thresholds, confidence, owner hints, and fingerprints.
- Ownership router: classification into `workspace_owned`, `platform_owned`, `mixed`, or `unknown`.
- Proposal queue: recommended changes with evidence, maturity, confidence, approval requirements, target owner, and target apply path.
- Validation surfaces: inline conversation elements, mission feedback, review cards, and admin inboxes.
- Approval and apply coordination: one-click approval that calls the correct guarded path.
- Measurement loop: post-approval outcome tracking so the system learns what worked.
- Learning capture: store the experiment result, route-out reason, Brain signal review, or workflow outcome so future suggestions inherit the lesson.

It should not own:

- Brain extraction itself. Atlas owns that.
- Agent/skill mutation itself. Jaime owns that through guarded apply paths.
- Workflow execution itself. Loop owns that.
- Space/task/channel primitives. Vibey owns those.
- Platform/product fixes themselves. Internal Vibey owners handle those after the Suggestion Layer routes and clusters the evidence.

## Road Priority

| Priority | Roads | Why |
| --- | --- | --- |
| P0 | SIL-R04, SIL-R06, SIL-R10 | These are now the first implemented proposal-and-approval loop for skills and agent files; keep hardening review, apply, and route-out behavior here. |
| P1 | SIL-R03, SIL-R05, SIL-R07 | These connect daily work, mission quality, and repeated operations into useful recommendation signals. |
| P2 | SIL-R01, SIL-R08, SIL-R09 | These make the brain proactive after onboarding and over time. |
| P3 | SIL-R11, SIL-R12 | These create the full future loop: apply, measure, and eventually generate ready-for-review outputs automatically. |

## Focused Plans

- `Agent Learning Loops`: `.docs/plans/agent-learning-loops.md`. This is the original focused plan for SIL-R04, SIL-R05, SIL-R06, SIL-R10, and SIL-R11: observe, rank, classify, propose, approve, apply, and measure Jaime-owned agent upgrades.
- `Agent Learning Loops V2`: `.docs/plans/agent-learning-loops-v2.md`. This is the current implementation-aligned plan for the skill and agent-file proposal lane now backed by Agent Improvement proposal tables, Dream Ops, checkpoints, route-outs, and experiments.

## Development Space Mirror

Production mirror:

- Org: `699e3530-881c-4653-b507-4c4b5993538f`
- Space: `7047321e-273d-4104-a2b9-7aa2aa284509` (`Development`)
- Category id: `suggestion_improvement_layer`
- Category label: `Suggestion & Improvement Layer`

Sync rule:

- One Development task per `SIL-R*` road.
- Store the category at `space_items.custom_data.category`.
- Store the road id at `space_items.custom_data.suggestion_layer_id`.
- Store maturity at `space_items.custom_data.maturity_level` and `space_items.custom_data.maturity_percent`.
- Store the repo source at `space_items.custom_data.source_doc`.
- Use task status for execution tracking, not maturity. Example: a 60% mature road can still be `in_progress`.

## Open Questions

- Should the road registry live only in docs first, or become a typed platform object?
- Which road should own the first user-facing report: onboarding brain report, agent improvement report, or workflow automation report?
- Should each building manager draft proposals directly, or should they emit signals and let the Suggestion Layer assemble the final proposal?
- What minimum fields define the first shared improvement signal?
- What thresholds promote raw signals into a cluster and clusters into an issue?
- Should the first router default every unclear cluster to `unknown` internal-only until reviewed?
- What evidence is enough for one-click approval without exposing full private conversations?
- Which approved changes need automatic rollback support versus checkpoint-only recovery?
- Should Brain lint, Brain cross-suggestions, and Company Cortex signal review become one Atlas-owned Brain improvement proposal lane?
- Where should hidden Jaime route-outs appear for internal product/engineering review?
