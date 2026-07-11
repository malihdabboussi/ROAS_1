# Flows V2: Custom Workflow Builder Plan

Last Modified: 2026-06-22

## TLDR For Architect

Do not turn Loop into an all-powerful agent that browses every Brain, Space, Agent, and integration tool ad hoc. That path will create high token cost, slow builds, weak validation, and hallucinated schemas. The right next layer is a server-owned Flow Build Intelligence Layer on top of the existing `space_automations` runtime.

Keep executable flows on `space_automations`. V2 should add planning, context grounding, custom action blueprints, validation, and evaluation. It should not introduce a new workflow runtime yet.

Custom actions should first be reusable blueprints/macros that compile into existing primitive triggers and actions. Arbitrary code actions, raw external API calls, and new runtime executors should be future phases after the blueprint system proves demand and safety.

Loop needs one high-quality build context packet per Space/build session: Space views, fields, custom field options, available template tokens, existing flows, connected accounts, available agents, safe Brain scopes, and capability graph rules. Without that packet, Loop will waste calls asking scattered tools for facts it should have been given deterministically.

The build lifecycle should be strict: understand intent, fetch build context, search capabilities, ask structured clarification questions only for missing or ambiguous required decisions, draft a plan after answers are available, compile to a disabled draft, validate server-side, then publish only after a clean validation and explicit user/admin approval.

Evaluation must be part of the implementation, not a later analytics add-on. Every build session should record tool calls, capability searches, unsupported action attempts, schema validation errors, context validation errors, clarification count, premade action reuse rate, custom action creation rate, human edits after draft, validation attempts, publish success, latency, tokens, and credits.

The platform learning loop should be review-gated. User custom actions can produce normalized promotion candidates by stripping user-specific fields, statuses, account IDs, and Space IDs. They should not automatically become global premade actions until they show repeated successful use, low human edit rate, low validation error rate, and pass platform review.

The main architectural decision: build a Flow Control Plane, not a bigger action list. CRUD tools like `create_action`, `update_action`, and `list_steps` are too crude once there are hundreds of capabilities. Loop needs searchable capability indexes, typed contracts, resource-aware context, plan objects, compiler errors, and evaluation traces.

## Current State

The current Flows V1 direction is structurally good:

- The execution engine is still `space_automations`.
- Admin Flow APIs were added around existing automation creation, validation, schedule sync, external trigger sync, and publish behavior.
- Loop is a protected system agent with flow-specific actions.
- Capability search is bounded and paginated instead of exposing a flat list.
- V1 intentionally supports existing triggers/actions only.

The main V1 gap is that the capability catalog is static and shallow. It knows trigger/action labels, categories, required fields, and examples, but it does not yet know the selected Space schema, custom fields, view inventory, connected account state, Brain scopes, agent skills, template tokens, action output contracts, or dynamic compatibility rules.

That gap matters more in V2 because custom workflows are mostly about data movement:

- External data into Vibey: GitHub, YouTube, websites, social platforms, Drive, Sheets, forms, email, Slack, Notion, Salesforce.
- Internal data movement: triggers to tasks, docs, artifacts, contacts, Brain context, Space views, custom fields, agents, and generated outputs.
- Vibey data out: email, Slack, channels, Cursor/GitHub PRs, published artifacts, connected apps.

If Loop has to discover all of that through generic tool calls every time, it will eventually guess field names, invent capabilities, choose the wrong object, or ask the user questions the platform could have answered automatically.

## Evidence From The Repo

Existing runtime and storage:

- `documentation/features/spaces-automation.md` documents the current decision to reuse `space_automations` and avoid a new runtime.
- `apps/api/src/modules/spaces/controllers/space-automations.controller.ts` already exposes admin-only Flow endpoints for listing, drafting, updating, validating, publishing, and searching capabilities.
- `apps/api/src/modules/spaces/repositories/space-automations.repository.ts` persists automation rows and keeps drafts disabled.
- `apps/api/src/modules/spaces/services/space-automation.service.ts` executes automation actions in sequence and exposes prior step results into template context.

Existing validation:

- `apps/api/src/modules/spaces/services/space-automation-publishable.ts` enforces strict publish validation, action count limits, schedule safety, output contract rules, and context validation.
- `apps/api/src/modules/spaces/services/automation-context-validation.ts` already models produced and required contexts such as task, contact, artifact, message, form, and social research.
- `apps/api/src/modules/spaces/dto/index.ts` already separates loose draft schemas from strict published automation schemas.

Existing capability catalog:

- `packages/api-shared/src/types/flow-capabilities.ts` provides `searchFlowCapabilities`, `getFlowCapability`, category filtering, kind filtering, cursor paging, and limit clamping.
- `apps/api/src/modules/spaces/services/space-flow-capability.service.ts` currently wraps the shared static catalog.

Existing Loop tool layer:

- `apps/agent-api/src/modules/artifacts/services/artifact-flows.service.ts` implements Loop flow actions.
- That service currently duplicates weaker validation than the backend Flow API. V2 should move toward server-owned validation and compilation instead of expanding duplicate validation in agent-api.

Existing policy boundaries:

- `packages/agent-policy/src/system-agent-contracts.ts` defines Loop as a protected system agent.
- `packages/agent-policy/src/action-contracts.ts`, `packages/agent-policy/src/domains.ts`, and `packages/agent-policy/src/role-defaults.ts` give Loop flow domains without making it owner of every Brain or Agent mutation.
- Agent/skill actions and Brain actions already exist in the artifact action schema surface, but they are governed by their own owners and domains. V2 should respect that instead of making Loop bypass Jaime or Atlas boundaries.

Existing Space schema:

- `apps/web/src/features/spaces/types/space-schema.ts` defines field types, view types, automation triggers, automation actions, `SpaceSchema`, `ViewDef`, `FieldDef`, and custom values via `field_values`/`custom_data`.
- This type surface is currently frontend-owned. V2 needs a backend/shared schema contract so Loop and backend validators can reason over the same Space schema.

## Core Design Decision

Build this as a Flow Control Plane:

1. Existing automation runtime remains the executor.
2. A new server-side capability graph becomes the source of truth for what Loop can build.
3. A build context service gives Loop scoped facts about the selected Space and available resources.
4. Loop produces a structured flow plan, not raw automation JSON first.
5. A compiler turns approved plans into disabled `space_automations` drafts.
6. Server validation proves the draft is valid before publish.
7. Custom actions are blueprint macros that compile into existing primitive actions.
8. Evaluation traces measure Loop quality from day one.

This keeps the powerful part agentic while keeping the dangerous part deterministic.

## In Scope For V2

- Build full custom flows from existing triggers/actions.
- Let Loop propose and create reusable custom action blueprints that expand into existing primitive actions.
- Add dynamic Flow build context for Spaces, views, fields, agents, safe Brain scopes, integrations, template tokens, and existing flows.
- Add structured clarification and plan approval before draft creation.
- Add stronger validation and compilation APIs.
- Add evaluation instrumentation for Loop build quality.
- Add admin UI for plan, clarification, capability matches, draft diff, validation, custom action library, and evaluation traces.
- Add review-gated platform learning from custom action usage.

## Out Of Scope For V2

- Arbitrary code execution as a custom action.
- Letting Loop directly modify Jaime, Atlas, or other protected agent system files.
- Letting Loop directly create new integration primitives that call unknown external APIs.
- Auto-promoting user-created custom actions into the global premade catalog.
- Replacing `space_automations` with a new workflow engine.
- Letting non-admin users publish platform-wide custom actions unless product explicitly changes access rules.

## Flow Build Context

Loop should not ask ten tools to discover basic facts. Add a single backend-composed context packet:

```ts
type FlowBuildContext = {
  space: {
    id: string
    name: string
    schema_version: string
    fields: FlowFieldRef[]
    views: FlowViewRef[]
    default_view_id?: string
  }
  template_tokens: FlowTemplateToken[]
  trigger_outputs: FlowDataContract[]
  action_outputs: FlowDataContract[]
  agents: FlowAgentRef[]
  brains: FlowBrainScopeRef[]
  integrations: FlowIntegrationRef[]
  existing_flows: FlowSummary[]
  custom_actions: FlowActionBlueprintSummary[]
  policy: FlowBuildPolicy
  context_hash: string
}
```

Important behavior:

- It must be scoped to one Space and one org.
- It must include only resources the current user and Loop are allowed to see.
- It must use compact summaries by default and fetch details on demand.
- It must include stable IDs and human labels so Loop does not invent identifiers.
- It must include a `context_hash`; plan compilation should fail if the Space schema changed since planning.

The context packet should answer questions like:

- What fields exist in this Space?
- Which field values/options are valid?
- Which views exist and what object types do they represent?
- Which template variables are valid for this trigger/action chain?
- Which agents can be invoked?
- Which Brain scopes can be searched or written through existing allowed actions?
- Which connected accounts are available?
- Which existing flows or custom action blueprints can be reused?

## Capability Graph

The static catalog should evolve into a typed capability graph. Each capability should describe:

- `capability_id`
- `kind`: trigger, primitive_action, blueprint_action, schema_mutation, external_connector
- `category`
- `input_schema`
- `output_schema`
- `required_contexts`
- `produced_contexts`
- `compatible_trigger_types`
- `compatible_previous_outputs`
- `required_resource_refs`
- `side_effects`
- `risk_level`
- `credit_estimate`
- `publish_requires_backend_sync`
- `examples`
- `normalization_signature`

The agent should search the graph, not list the graph.

Required search behavior:

- Query/category/kind/resource filters.
- Hard limit and cursor.
- Ranking by semantic match, required context availability, missing field count, and premade reuse.
- Return `why_matched`, `missing_requirements`, and `can_compile_now`.
- Never return an unbounded flat list.

This directly handles the "what if we have 500 steps and actions?" problem. Loop should see the top relevant options, not all options.

## Plan Object

Flow build state is split between a session and a plan. Clarification is a session state before a plan exists:

```ts
type FlowBuildSession = {
  id: string
  space_id: string
  user_intent: string
  status: 'intake' | 'clarifying' | 'planning' | 'planned' | 'validated' | 'compiled' | 'blocked'
  plan: FlowPlan | null
  context_hash: string
}
```

Loop should create a structured plan only after required pre-plan clarifications are answered:

```ts
type FlowPlan = {
  id: string
  space_id: string
  user_intent: string
  status: 'planned' | 'validated' | 'compiled' | 'blocked'
  trigger: FlowPlanTrigger
  steps: FlowPlanStep[]
  proposed_schema_changes: FlowSchemaChangeProposal[]
  custom_action_drafts: FlowActionBlueprintDraft[]
  validation: FlowPlanValidationSummary
  evaluation: FlowBuildEvaluationSummary
  context_hash: string
}
```

Each plan step should include:

- selected capability ID
- source of the selection: user request, Space schema, Brain context, connected account, existing blueprint, or agent inference
- required fields and where each field value came from
- produced data contracts
- user-visible explanation
- validation state
- compile target

The plan should be the main UI object after clarification is resolved. The automation draft is the compiled artifact, not the first thing Loop writes.

## Clarification Protocol

Clarification must be structured and minimal.

Loop should ask only when:

- A required field cannot be retrieved from build context.
- Multiple valid mappings exist and choosing one changes behavior.
- The flow sends data externally.
- The flow mutates Space schema.
- The flow publishes artifacts, sends communication, creates PRs, or spends meaningful credits.
- The user gave a preference-dependent instruction.

Loop should not ask when:

- The answer exists in the Space schema.
- The answer exists in connected account metadata.
- The answer exists in the selected flow draft.
- The answer is a deterministic default from the capability schema.

Question shape:

```ts
type FlowClarificationQuestion = {
  id: string
  text: string
  type: 'single_choice' | 'multiple_choice'
  options: Array<{ id: string; label: string; description?: string }>
  required: boolean
}
```

Every Flow clarification is stored as a `project_flow_build_clarification` row tied to the build session, not embedded in the plan. Optional target metadata can still point to a step, field, integration, or plan-level decision when the source is known.

## Custom Actions

V2 custom actions should be blueprints first:

```ts
type FlowActionBlueprint = {
  id: string
  org_id: string
  owner_user_id: string
  name: string
  description: string
  category: string
  status: 'draft' | 'active' | 'deprecated'
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  required_contexts: string[]
  produced_contexts: string[]
  action_template: AutomationAction[]
  compatibility_rules: Record<string, unknown>
  normalization_signature: string
  source_flow_id?: string
  created_by_agent_key?: 'loop'
}
```

Blueprints are reusable macros:

- They can contain one or more existing `AutomationActionSchema` actions.
- They can define input variables like `target_status`, `agent_key`, `repo_url`, or `content_source`.
- They compile into normal automation actions before publish.
- They do not require a new executor.

This is the safest way to create custom workflow building blocks without opening arbitrary runtime behavior.

Example:

- User asks: "When a GitHub issue is labeled bug, ask my dev agent to investigate and create a PR."
- Loop searches premade capabilities.
- If no exact premade exists, Loop creates an org blueprint:
  - Trigger requirement: GitHub issue event.
  - Steps: create task, send_to_agent, send_to_cursor.
  - Inputs: repo, label, agent_key, base_branch, completion status.
  - Output: task + Cursor PR metadata.

The blueprint becomes reusable inside the org. It is not yet a global premade action.

## Custom Field And View Changes

Custom fields are schema mutations, not ordinary flow action fields.

Loop may propose:

- Create a custom field.
- Add an option to a select field.
- Add a view.
- Bind a form question to a Space field.
- Map incoming data to an existing field.

Loop should not silently mutate the Space schema while compiling a flow. Schema changes must be explicit plan items with user approval.

Schema mutation validation should check:

- Field ID uniqueness.
- Field type compatibility.
- Existing view visibility impact.
- Select option IDs and labels.
- Whether existing automations reference the same field.
- Whether new fields are required and could break item creation.

After a schema mutation is applied, the Flow build context hash must refresh before compilation.

## Brain, Agent, And Space Boundaries

Loop's job is building flows. It should know the available Brain, Agent, and Space surfaces, but it should not own every mutation.

Recommended boundaries:

- Loop can read scoped build context for Brain availability and agent availability.
- Loop can compile flows that use existing Brain-related automation actions, such as adding Brain context to a task or ingesting YouTube content into an Agent Brain.
- Loop can propose agent/skill changes when a workflow requires them.
- Jaime-owned HR/agent mutations should stay behind Jaime or explicit narrow tools.
- Atlas-owned Brain architecture should stay behind Atlas or existing Brain-specific tools.

If a workflow needs an agent skill update, Loop should create a plan/delegation item:

```ts
type FlowDelegationProposal = {
  target_agent_key: 'jaime' | 'atlas'
  reason: string
  requested_change: string
  blocking: boolean
}
```

This preserves protected system-agent ownership and keeps Loop focused.

## Compiler

The compiler turns a validated plan into a disabled draft.

Compiler requirements:

- Expand blueprint actions into primitive `AutomationActionSchema` actions.
- Resolve all field IDs, agent keys, brain IDs, connected account IDs, and template tokens.
- Reject any ID that was not present in build context or created through an approved schema mutation.
- Reject unsupported capability IDs.
- Keep `enabled=false` and `is_draft=true`.
- Store plan metadata on the draft or in a related build-session table.
- Use the backend Flow API/service path, not direct agent-api database writes.

The compiler should return structured errors:

```ts
type FlowCompileError = {
  code:
    | 'missing_required_field'
    | 'unknown_capability'
    | 'unknown_field'
    | 'unknown_agent'
    | 'unknown_brain_scope'
    | 'unknown_connected_account'
    | 'invalid_template_token'
    | 'context_mismatch'
    | 'schema_changed'
  path: string
  message: string
  suggested_questions?: FlowClarificationQuestion[]
}
```

## Validation

Validation should be layered:

1. Plan validation: Does the plan have all required decisions?
2. Capability validation: Are all capabilities allowed and compatible?
3. Resource validation: Do all IDs exist and belong to the active org/Space?
4. Schema validation: Does compiled JSON pass existing automation schemas?
5. Context validation: Does every action receive the context it needs?
6. Template validation: Are template tokens legal for the trigger/action chain?
7. Side-effect validation: Does publish require explicit approval?
8. Runtime publish validation: Existing publish rules still run before enabling.

No publish should succeed unless all layers pass.

Important invariant:

Loop cannot "explain around" a validator error. The only valid outputs are fix the plan, ask a clarification question, or mark the workflow unsupported.

## Evaluation

Evaluation needs to answer whether Loop is actually good at building flows.

Record these metrics per build session:

- `tool_calls_total`
- `tool_calls_by_action`
- `capability_searches_total`
- `capability_gets_total`
- `unsupported_action_attempts`
- `unknown_field_attempts`
- `unknown_agent_attempts`
- `unknown_brain_attempts`
- `schema_validation_errors_total`
- `context_validation_errors_total`
- `compile_errors_total`
- `publish_validation_errors_total`
- `clarification_questions_total`
- `clarifications_answered_from_context_total`
- `clarifications_answered_by_user_total`
- `premade_capability_reuse_rate`
- `custom_action_blueprints_created`
- `custom_action_blueprints_reused`
- `draft_compile_attempts`
- `draft_validation_attempts`
- `human_edits_after_compile`
- `publish_success`
- `time_to_valid_draft_ms`
- `time_to_publish_ms`
- `tokens_prompt`
- `tokens_completion`
- `credits_estimated`
- `credits_spent`

Add derived quality scores:

- Premade fit score: Did Loop reuse an existing capability when one existed?
- Hallucination score: Did Loop reference unsupported capabilities, fields, agents, brains, or tokens?
- Clarification efficiency: How many questions were necessary vs answerable from context?
- Validation efficiency: How many compile/validate attempts before success?
- Human correction rate: How much did the user edit after Loop drafted?
- Cost efficiency: Tool calls and tokens per valid published flow.

Suggested V2 quality gates:

- Zero unsupported capability IDs in compiled drafts.
- Zero unknown field IDs in compiled drafts.
- Capability search must happen before draft compilation.
- Validation must happen before publish.
- A missing required field must become either a sourced value or a structured clarification.
- More than three failed compile attempts should stop and ask for human review.
- More than five clarification questions should switch to a plan review instead of continuing chat.

## Golden Eval Scenarios

Create fixtures for common workflows:

1. Gmail lead email to task, assign agent, create email artifact, send reply.
2. Form submission to contact, tag contact, create follow-up task.
3. GitHub issue to dev task, send to dev agent, send to Cursor, create PR.
4. YouTube channel ingestion to Agent Brain, then create research task.
5. Social research schedule, select outliers, enrich transcripts, generate social post artifact.
6. Website or blog URL ingestion to Brain context, create summary document.
7. Space custom field mapping from inbound data into a task.
8. Contact update triggers a customer Brain context search and note.
9. Existing custom action blueprint reuse.
10. Unsupported user request that must create a backlog/promotion candidate instead of hallucinating an action.

Each scenario should assert:

- Correct capabilities selected.
- No unsupported action invented.
- Required fields sourced or clarified.
- Context chain is valid.
- Draft is disabled before publish.
- Publish requires successful validation.
- Tool calls stay under a defined budget.

## Learning And Promotion

Custom actions can become platform learning signals.

Store promotion candidates when:

- A user creates a custom blueprint.
- A user edits a Loop-generated flow into a stable pattern.
- Multiple flows use the same normalized pattern.
- A custom blueprint repeatedly validates and publishes successfully.

Normalize by removing user-specific details:

- Org IDs.
- User IDs.
- Space IDs.
- Field IDs.
- Exact status option IDs.
- Connected account IDs.
- Specific agent keys unless the action is inherently agent-type-specific.
- Specific repo URLs, channel URLs, email addresses, document IDs, artifact IDs.

Keep:

- Trigger class.
- Required context.
- Side effects.
- Input/output contract.
- Resource categories.
- Data movement shape.
- Validation rules.

Promotion should require:

- Repeated use.
- Low human edit rate.
- Low validation failure rate.
- Low runtime failure rate.
- Clear category.
- Platform review.

Promotion output can be:

- New premade capability.
- New org template.
- New blueprint seed.
- New primitive action backlog item.

## Backend Implementation Plan

Shared contracts:

- Extend `packages/api-shared/src/types/flow-capabilities.ts` into a graph-aware model.
- Add `packages/api-shared/src/types/flow-build-context.ts`.
- Add `packages/api-shared/src/types/flow-plans.ts`.
- Add `packages/api-shared/src/types/flow-blueprints.ts`.
- Add `packages/api-shared/src/types/flow-evaluation.ts`.
- Export these from `packages/api-shared/src/index.ts`.

Spaces backend:

- Extend `apps/api/src/modules/spaces/services/space-flow-capability.service.ts` to compose static capabilities with Space schema, connected accounts, agents, Brain scopes, and custom blueprints.
- Add `apps/api/src/modules/spaces/services/space-flow-build-context.service.ts`.
- Add `apps/api/src/modules/spaces/services/space-flow-plan.service.ts`.
- Add `apps/api/src/modules/spaces/services/space-flow-blueprint.service.ts`.
- Add `apps/api/src/modules/spaces/services/space-flow-compiler.service.ts`.
- Add `apps/api/src/modules/spaces/services/space-flow-evaluation.service.ts`.
- Add plan, blueprint, compile, and evaluation DTO schemas to `apps/api/src/modules/spaces/dto/index.ts`.
- Extend `apps/api/src/modules/spaces/controllers/space-automations.controller.ts` with V2 endpoints.
- Extend `apps/api/src/modules/spaces/services/automation-context-validation.ts` into a reusable context graph.
- Keep `apps/api/src/modules/spaces/services/space-automation-publishable.ts` as the final publish gate.
- Keep `apps/api/src/modules/spaces/services/space-automation.service.ts` executing primitive actions; blueprint expansion happens before runtime.

New backend endpoints:

- `GET /api/spaces/:id/automations/flows/build-context`
- `POST /api/spaces/:id/automations/flows/build-sessions`
- `GET /api/spaces/:id/automations/flows/build-sessions/latest`
- `GET /api/spaces/:id/automations/flows/build-sessions/:sessionId`
- `POST /api/spaces/:id/automations/flows/build-sessions/:sessionId/clarifications`
- `POST /api/spaces/:id/automations/flows/build-sessions/:sessionId/clarifications/answers`
- `POST /api/spaces/:id/automations/flows/plans`
- `GET /api/spaces/:id/automations/flows/plans/:planId`
- `PATCH /api/spaces/:id/automations/flows/plans/:planId`
- `POST /api/spaces/:id/automations/flows/plans/:planId/validate`
- `POST /api/spaces/:id/automations/flows/plans/:planId/compile`
- `GET /api/spaces/:id/automations/blueprints`
- `POST /api/spaces/:id/automations/blueprints/drafts`
- `POST /api/spaces/:id/automations/blueprints/:blueprintId/validate`
- `POST /api/spaces/:id/automations/blueprints/:blueprintId/activate`
- `GET /api/spaces/:id/automations/flows/evaluations/:sessionId`

Agent API:

- Update `apps/agent-api/src/modules/artifacts/services/artifact-flows.service.ts` so build, compile, validate, and publish behavior routes through backend services or matching server-owned contracts.
- Add action schemas in `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`.
- Update `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`.
- Update `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`.
- Update policy files in `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/action-contracts.ts`, and `packages/agent-policy/src/registry.ts`.
- Add Loop skill/action links in `apps/agent-api/src/modules/agent-sync/contracts/agent-action-skill-links.ts`.
- Add Flow Building Protocol V2 to `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.ts`.

Policy:

- Keep `read_flows` and `manage_flows`.
- Add a narrow `manage_flow_blueprints` domain only if blueprints need separate authorization.
- Do not give Loop broad `manage_agents` or unrestricted Brain write domains for this feature.
- Add exclusive Loop ownership for new flow-planning and blueprint actions.

## Database Plan

Add migrations for:

```sql
project_flow_build_session
project_flow_build_clarification
project_flow_action_blueprint
project_flow_action_blueprint_version
project_flow_build_evaluation
project_flow_action_promotion_candidate
```

Recommended table purposes:

- `project_flow_build_session`: one Loop build session, selected Space, user intent, context hash, session status, optional plan state, compiled automation ID.
- `project_flow_build_clarification`: structured pre-plan questions, answers, and row status for the session.
- `project_flow_action_blueprint`: active custom action definitions owned by org/user.
- `project_flow_action_blueprint_version`: immutable blueprint versions for audit and rollback.
- `project_flow_build_evaluation`: metrics and quality events.
- `project_flow_action_promotion_candidate`: normalized reusable patterns for review.

RLS and access:

- All rows must be org scoped.
- Space-linked rows must respect Space access.
- Publishing and activation should require admin in V2.
- Mutation should still pass existing Space edit checks.
- Promotion candidates should be platform-admin visible only unless product chooses otherwise.

## Frontend Implementation Plan

Extend `apps/web/src/features/flows`:

- Add a planning state store for Flow plans, clarifications, compile results, and validation results.
- Add build-context loading when a Space is selected.
- Add capability search UI that shows bounded results with missing requirements and why-matched text.
- Add plan preview with trigger, steps, data movement, schema changes, custom action drafts, and validation state.
- Add Flow-owned clarification cards with choices before the plan UI renders.
- Add a temporary `Clarifications` tab for four or more open questions.
- Add custom action blueprint library.
- Add validation panel with structured errors.
- Add evaluation/debug panel for admins.
- Add draft diff showing plan output vs compiled automation JSON.
- Replace interval polling with Supabase Realtime subscriptions for `project_flow_build_session` and `project_flow_build_clarification`.

UI rules:

- Loop chat stays on the left.
- Main pane owns the plan and editor state only after pre-plan clarification is answered.
- One to three open clarifications render in chat; four or more render in the `Clarifications` tab.
- The inspector must not show plan steps, score, or diagram while clarification is open.
- Publish remains disabled until validation passes.
- Schema changes require explicit approval.
- External send/PR/publish actions require explicit approval.
- Huge capability lists are never rendered.

## Loop Tool Plan

New Loop-owned actions:

- `get_flow_build_context`
- `create_flow_clarification`
- `create_flow_plan`
- `update_flow_plan`
- `answer_flow_clarification`
- `validate_flow_plan`
- `compile_flow_plan`
- `search_flow_blueprints`
- `get_flow_blueprint`
- `create_flow_blueprint_draft`
- `validate_flow_blueprint`
- `activate_flow_blueprint`

Existing actions should remain:

- `search_flow_capabilities`
- `get_flow_capability`
- `list_flows`
- `get_flow`
- `create_flow_draft`
- `update_flow_draft`
- `validate_flow_draft`
- `publish_flow`

But for V2, Loop should prefer plan/compile tools over direct draft creation.

## Loop Protocol V2

Instruction rules:

1. Always identify the active Space before planning.
2. Always fetch build context before selecting fields, agents, brains, integrations, or views.
3. Always search capabilities before creating a plan step.
4. Prefer premade capabilities and active blueprints before creating a new blueprint.
5. Never reference a field, view, agent, brain, account, token, or capability that was not returned by build context or capability search.
6. Ask structured Flow clarification only for unresolved required choices before creating a plan.
7. Present the plan after clarifications are resolved and before compiling.
8. Save only disabled drafts.
9. Validate before publish.
10. Do not publish side-effecting flows without explicit approval.
11. Do not invent unsupported actions.
12. If the request needs a new primitive action, create a promotion/backlog candidate instead of pretending it exists.

## Rollout Phases

Phase 0: Instrument V1

- Add evaluation session records around current Loop flow actions.
- Measure tool calls, validation errors, publish attempts, and human edits.
- No behavior change.

Exit criteria:

- Every Loop flow action has a session/event trace.
- Admin can inspect basic build quality.

Phase 1: Build Context And Capability Graph

- Add server-side build context.
- Extend capability catalog with dynamic Space schema, agents, Brain scopes, connected accounts, template tokens, and compatibility rules.
- Replace flat/static assumptions in UI and agent tools with graph search.

Exit criteria:

- Loop can answer field/view/agent/account questions from one context packet.
- Capability search returns missing requirements and compile readiness.

Phase 2: Plan, Clarification, Compiler

- Add plan tables, APIs, UI, and Loop tools.
- Add clarification protocol.
- Add compiler from plan to disabled automation draft.

Exit criteria:

- A complex flow can be planned, clarified, compiled, validated, and published without raw JSON editing.

Phase 3: Custom Action Blueprints

- Add org-scoped reusable action blueprints.
- Compile blueprints into primitive actions.
- Add blueprint library UI.

Exit criteria:

- Loop can create and reuse a custom action blueprint without adding a new runtime executor.

Phase 4: Learning And Promotion

- Add normalized promotion candidates.
- Add internal review UI/report.
- Seed high-confidence blueprints back into premade catalog after review.

Exit criteria:

- Platform can see which custom actions deserve premade treatment.

Phase 5: Custom Primitive Actions

- Only after blueprint data proves demand.
- Add connector/action SDK, sandboxing, secrets model, timeout/retry policy, and security review.

Exit criteria:

- Platform can safely add truly new execution primitives.

## Test Plan

Policy tests:

- Loop owns new flow-planning and blueprint actions.
- Other system agents cannot run Loop-exclusive actions unless explicitly allowed.
- Loop cannot mutate Jaime/Atlas-owned areas through flow tools.

Backend tests:

- Build context is scoped to active org and Space.
- Build context omits inaccessible resources.
- Capability graph search is bounded and ranked.
- Plan validation rejects missing fields.
- Plan validation rejects unknown capabilities.
- Plan validation rejects unknown field IDs.
- Compiler creates `is_draft=true` and `enabled=false`.
- Compiler rejects stale `context_hash`.
- Blueprint expansion produces valid `AutomationActionSchema` actions.
- Publish still runs existing publish validation.

Agent tool tests:

- Loop fetches context before compile.
- Loop searches capabilities before selecting a step.
- Loop asks clarification for missing required fields.
- Loop never compiles unsupported action IDs.
- Loop prefers premade capability when match exists.
- Tool call counts are recorded.

UI tests:

- Admin can open Flow plan view.
- Non-admin cannot access V2 build tools.
- Capability search is bounded.
- Clarification cards update plan state.
- Schema changes require explicit approval.
- Publish button is disabled until validation succeeds.
- Evaluation panel shows build metrics.

Eval harness tests:

- Golden scenarios pass.
- Unsupported scenarios produce backlog/promotion candidates, not fake actions.
- Tool call budget regressions fail tests.
- Validation error regressions fail tests.

Regression tests:

- Existing automations continue to create, update, delete, run, schedule, and publish.
- Existing `/flows` V1 UI behavior remains available.
- Existing Space modal builder remains available during rollout.

## Risks And Mitigations

Risk: Loop hallucinates fields, actions, agents, or template tokens.

Mitigation: Compiler rejects anything not returned by build context/capability graph.

Risk: Token usage explodes as integrations and actions grow.

Mitigation: Use one compact build context packet, bounded capability search, detail-on-demand, and context hashes.

Risk: Custom actions become unsafe arbitrary code.

Mitigation: V2 custom actions are blueprints compiled into existing primitive actions only.

Risk: The platform pollutes premade actions with one-off user workflows.

Mitigation: Store promotion candidates, require repeated successful usage, and review before global promotion.

Risk: Loop bypasses protected system-agent boundaries.

Mitigation: Keep Brain and Agent mutations behind Atlas/Jaime ownership. Loop can propose/delegate; it should not own everything.

Risk: Validation logic splits between API and agent-api.

Mitigation: Move compile/publish validation to backend-owned services and make agent tools call those contracts.

Risk: Schema changes break existing Space views.

Mitigation: Treat schema changes as explicit plan items with validation and approval.

## Extra Context Agents Need Before Implementation

Before implementation, the coding agent should gather these exact facts:

- Current Supabase schema for `space_automations`, `agents_registry`, `agent_skills`, connected accounts, Brain tables, and any org/user integration tables.
- Existing backend service that updates Space schema and validates custom fields.
- Existing analytics/event logging patterns, if any, so Flow evaluation does not create a parallel telemetry style.
- Existing agent/skill mutation boundaries for Jaime.
- Existing Brain write/read boundaries for Atlas.
- Exact connected app account model and provider capability source.
- Current UI state management patterns inside `apps/web/src/features/flows`.
- Whether custom blueprints are user-scoped, org-scoped, or both.
- Whether non-admin Space editors can use custom blueprints in the future.
- Credit budget and token budget targets for a successful build.
- Product decision for external side effects: which actions require explicit approval every time.
- Product decision for global promotion thresholds.

## Recommended Next Decision

Approve V2 as a control-plane implementation:

- Phase 0: evaluation instrumentation on current Loop.
- Phase 1: dynamic build context and capability graph.
- Phase 2: plan, clarification, and compiler.
- Phase 3: org-scoped blueprint custom actions.

Do not start with arbitrary custom runtime actions. Start with blueprints that compile into existing automation primitives. This gives users custom workflow creation while keeping execution, validation, RBAC, and learning measurable.

## Implementation Status - 2026-06-07

Implemented the first V2 control-plane slice:

- Added shared Flow Builder contracts and deterministic evaluation scoring in `packages/api-shared/src/types/flow-builder.ts`.
- Added `project_flow_build_session`, `project_flow_build_clarification`, `project_flow_action_blueprint`, blueprint version, evaluation, and promotion candidate tables in `supabase/migrations/20260607095644_flow_builder_v2.sql`.
- Added admin-only backend build-context, plan, clarification, validate, compile, blueprint, and evaluation endpoints under the Spaces automation module.
- Added Loop-owned agent tool actions for build context, plan creation/update, clarification answers, validation, compile, blueprint management, and evaluation.
- Added an admin Loop-first Flow Build Inspector in the `/flows` UI for durable build state, structured clarifications, validation, compile-to-disabled-draft, and evaluation summary.
- Corrected capability catalog payloads to match existing automation schemas, including schedule timezone, communication templates, artifact fields, connected-account fields, Cursor repo URL, and social/Brain actions.
- Added a five-scenario eval harness for hard-user prompts.

Eval harness results:

- `premade-vague-status-agent`: 100, rank A.
- `premade-github-dev-pr`: 100, rank A, with missing GitHub connection and repo URL tracked as clarifications.
- `custom-blueprint-reuse`: 85, rank B.
- `unsupported-custom-api`: 70, rank C.
- `bad-hallucinated-plan`: 0, rank F.

Deferred:

- Arbitrary code/custom external API actions remain out of scope.
- Global promotion from custom blueprint to premade capability remains review-gated and not automatic.
- Connected account, Brain scope, and agent availability context should be made richer before broad rollout.

## Implementation Status - 2026-06-07 Loop-First Inspector

Implemented the Loop-first UI/state contract slice:

- Replaced the wizard-like `FlowsBuilderPanel` with a live `FlowBuildInspector` in `/flows`.
- Added latest active build-session endpoints under `/api/spaces/:id/automations/flows/build-sessions`.
- Added shared inspector state contracts: `FlowBuildSessionSummary`, `FlowBuildInspectorStage`, and `FlowBuildRequiredNextAction`.
- Added deterministic required-next-action mapping from durable session state instead of frontend button flow.
- Added Supabase Realtime updates via `useFlowBuildSession`, with chat stream-settled refresh for faster Loop feedback.
- Added structured clarification answer submission from Flow-owned clarification cards.
- Kept Manage, Browse, History, and the existing flow editor behavior intact.
- Updated Loop awareness context with server-managed build-state awareness, without exposing raw build session IDs to Loop.
- Aligned Loop flow-builder tool writes with inspector-readable session fields and `project_flow_build_clarification` rows: `status`, `plan`, `trace_events`, `validation_errors`, `automation_id`, and `evaluation_summary`.

Decision:

- Loop owns planning and tool calls.
- The right pane inspects only real plan and post-plan state; pre-plan clarification renders in chat or the `Clarifications` tab.
- No free-text plan/validate/compile/evaluate wizard remains in the UI.
- Supabase Realtime is the V1 bridge for build-state updates; no SSE/chat-runtime rewrite was added.

## Implementation Status - 2026-06-07 Loop Clarification Correction

Fixed the first live Loop regression:

- Removed protocol wording that told Loop to ask for the “Done status id” when a status was missing.
- Added hard Loop rules: never ask users for internal IDs in chat, resolve IDs from build context/list/get tools, and create Flow-owned clarification rows when a human choice is still required.
- Added normalized Space context to `get_flow_build_context` in the agent-api tool path: views, fields, option labels, option IDs, existing flow refs, template tokens, and context hash.
- Added field `option_refs` to the shared Flow Builder context so statuses and custom field options preserve both label and ID.
- Added action-schema guidance that Flow clarifications are created before `create_flow_plan`, not embedded in plan payloads.

Decision:

- Flow clarification is pre-plan. One to three questions render as chat cards; four or more render in the `Clarifications` tab.
- Loop should create/update the durable plan only after required clarification answers are available.
- Human-facing questions should ask for labels/choices, never UUIDs or platform IDs.

## Implementation Status - 2026-06-07 Server-Owned Loop Build State

Fixed the second live Loop regression: Loop was being asked to reason about Flow build session IDs and continuation state.

- Added server-owned active Flow build context in `RequestContextService`, matching the existing active Space scope pattern.
- Added artifact action defaulting so `update_flow_plan`, `answer_flow_clarification`, `validate_flow_plan`, `compile_flow_plan`, and `evaluate_flow_plan` can omit `session_id` during normal `/flows` usage.
- Added fallback resolution from the latest Space build session, which connects a UI-started build session to Loop's next tool call.
- Added `target_automation_id` to the structured Flow plan, separate from compiled `automation_id`.
- Added a `draft_flow_plan` / `target_selected` inspector state for sessions started from the UI before Loop drafts trigger/action steps.
- Added a Loop-first start panel with `Create New` and `Update a Flow`; update mode uses a searchable flow picker and preselects the flow currently open in the editor.
- Updated DB-first Loop skill/identity seed text through a new migration so Loop no longer says V1-only or asks users for exact platform values.

Decision:

- Loop builds and updates flows; the harness owns session selection.
- The UI chooses create vs update and stores that target in the durable build session.
- Loop should omit build session IDs and continue the active server-managed build.

## Implementation Status - 2026-06-07 Loop Action Surface Correction

Fixed the third live Loop regression: Flow Builder actions existed in schemas and handlers, but not every runtime exposure layer was aligned.

- Added the full Flow Builder action set to Loop's artifact capability allowlist, including build context, plan, clarification, validation, compile, blueprint, and evaluation actions.
- Added the full Flow Builder action set to the internal backend action tool enum used by the surfaced `campaign_capability` tool.
- Added first-class Flow action docs to the generated `vibey-api` skill reference so Loop no longer sees generic fallback docs for `create_flow_plan`, `compile_flow_plan`, or blueprint actions.
- Updated generated skill wording to explain that `campaign_capability` is the platform-surfaced name for the same backend action surface documented as `vibey_backend`.
- Added a DB-first Loop skill migration with the full action surface and server-owned session wording.
- Expanded tests so Loop RBAC, action registry exposure, Flow protocol rendering, and generated `vibey-api` docs fail if the Flow action set regresses.

Decision:

- Flow actions are not a separate hidden tool family. Loop calls them through the same backend action surface as other platform actions.
- The skill should teach production behavior, not V1-only premade action limits.

## Implementation Status - 2026-06-08 Loop Flow Clarification Pre-Plan

Moved clarification out of `FlowBuildPlan` and into the build session:

- Added session states `intake`, `clarifying`, `planning`, `planned`, `validated`, `compiled`, and `blocked`.
- Limited plan states to `planned`, `validated`, `compiled`, and `blocked`; plans can be `null` before planning.
- Made `project_flow_build_clarification` the source of truth for open and answered questions, with backfill from legacy plan/session question fields.
- Added `create_flow_clarification` to Loop's Flow-owned action surface and removed question fields from `create_flow_plan`.
- Updated Loop instructions, generated action docs, action schemas, policy contracts, and sync behavior so Loop clarifies first and plans second.
- Replaced Flow build-session polling with Supabase Realtime subscriptions for session and clarification rows.
- Added the `Clarifications` tab for four or more open questions, while one to three questions render as existing chat clarification cards.
- Removed clarification rendering from `FlowBuildInspector`; the inspector now shows only real plans and post-plan validation, compile, and evaluation state.
- Removed Loop from the generic Space agent picker while preserving Loop on the global chat rail when work context is `flows`.

Decision:

- Clarification is a pre-plan state, not a plan status.
- The right pane must not show a plan, steps, score, or diagram while open Flow clarifications exist.
- Generic chat clarification actions stay available for other agents, but Loop Flow builds use the Flow-owned clarification action.

## Implementation Status - 2026-06-22 Loop Build Continuation State

Fixed the fourth live Loop regression: a UI-started Flow build session could be active without a drafted `FlowBuildPlan`, but Loop only received a generic active-session signal.

- Added `flow_build_session_status`, `flow_build_has_plan`, `flow_build_required_next_action`, and `flow_build_inspector_stage` to the `/flows` Loop awareness context.
- Wired those values from the server-owned latest build-session summary already loaded by `useFlowBuildSession`.
- Made `flow_build_required_next_action` authoritative for Loop continuation routing: draft, clarify, validate, update, compile, evaluate, review, or blocked.
- Corrected the generated direct `create_flow_draft` example to use the current `status_change` trigger schema instead of the stale `task_status_changed` shape.

Data Flow:

`project_flow_build_session` and `project_flow_build_clarification` -> backend latest-session summary -> `useFlowBuildSession` -> `FlowsPage` -> `buildLoopFlowsAwarenessContext` -> Loop tool choice.

Decision:

- The UI does not invent Flow build state; it forwards the backend-derived required next action.
- Loop must draft with `create_flow_plan` when the active session is still `draft_flow_plan`, even if the session is already server-managed active.
- A stale direct-draft example is treated as agent behavior drift because generated action docs are part of Loop's executable contract.
