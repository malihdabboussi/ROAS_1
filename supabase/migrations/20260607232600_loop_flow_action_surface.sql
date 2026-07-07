-- Loop Flow Builder action-surface correction.
-- Keeps the DB-first Loop skill aligned with the generated vibey-api action surface.

INSERT INTO public.agent_skills (
  user_id,
  org_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source
)
VALUES (
  NULL,
  NULL,
  'loop',
  'flow-builder',
  'Flow Builder',
  'Plan, draft, validate, evaluate, and publish Space automation flows through server-managed build sessions.',
  $skill$# Flow Builder

Use this skill whenever the user wants to create, edit, inspect, validate, evaluate, or publish a Space automation flow.

## Operating Model

- The app/server harness owns the active Space, active Flow build session, and selected update target.
- Loop builds flows; Loop does not ask for, mention, copy, or manually manage session IDs.
- In `/flows`, continuation actions can omit `session_id`; the backend attaches the active build session for `update_flow_plan`, `answer_flow_clarification`, `validate_flow_plan`, `compile_flow_plan`, and `evaluate_flow_plan`.
- If the runtime exposes `campaign_capability`, treat it as the surfaced name for the same backend action tool documented as `vibey_backend`; call Flow actions through that tool's `action`, `label`, and `data` payload.
- If the user chose “Update a Flow”, inspect the selected flow with `get_flow` before editing so existing trigger/action payloads are preserved.

## Protocol

1. Load Space build context with `get_flow_build_context`.
2. Search bounded capabilities with `search_flow_capabilities`; use `get_flow_capability` for exact required fields.
3. Resolve platform IDs from build context and exact list/get actions. Never ask the user for UUIDs, status IDs, field IDs, view IDs, agent IDs, connected account IDs, or integration IDs.
4. If a human choice is still required, save it as `clarification_questions` on the flow plan. The Flows inspector renders those questions; do not print numbered clarification questions in chat.
5. Prefer premade capabilities before custom blueprints.
6. Custom blueprints must compile to supported automation action payloads. Do not invent hidden action types, arbitrary code, guessed connected-app triggers, or external API calls.
7. Update the active plan, validate it, compile into a disabled draft, then evaluate non-trivial builds.
8. Publish only after validation succeeds.

## Backend Actions

Call these through the backend action surface currently exposed by the runtime (`vibey_backend` or surfaced `campaign_capability`):

- `get_flow_build_context`: load scoped Space facts, fields, options, flows, tokens, and capability summary.
- `search_flow_capabilities`: bounded capability search by query, category, kind, and cursor.
- `get_flow_capability`: inspect required fields, compatibility notes, and examples for one capability.
- `list_flows`: list Space automations as flows.
- `get_flow`: inspect one flow before editing.
- `create_flow_plan`: create a new chat-started plan or fill a server-started placeholder session.
- `update_flow_plan`: update the active plan.
- `answer_flow_clarification`: apply inspector answers to the active plan.
- `validate_flow_plan`: validate the active plan.
- `compile_flow_plan`: compile the active plan into a disabled `space_automations` draft.
- `evaluate_flow_plan`: record build quality metrics.
- `list_flow_blueprints`: list reusable custom blueprints.
- `get_flow_blueprint`: inspect a reusable custom blueprint.
- `create_flow_blueprint_draft`: create a draft blueprint that compiles into supported automation action payloads.
- `validate_flow_blueprint`: validate a draft blueprint.
- `activate_flow_blueprint`: activate a validated blueprint for reuse.
- `create_flow_draft`, `update_flow_draft`, `validate_flow_draft`, `publish_flow`: direct draft management and publish operations.

## Guardrails

- Do not ask users for internal IDs. Resolve IDs automatically or ask label-based clarification questions in the inspector.
- Do not abandon an active build. If validation or compile fails, update the plan, ask a clarification through the plan, or mark the blocker in the plan.
- Do not create custom reusable action definitions that execute outside supported automation payloads.
- Keep work scoped to the active Space unless the user explicitly chooses another Space.
$skill$,
  true,
  'system'
)
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = EXCLUDED.is_enabled,
  source = EXCLUDED.source,
  updated_at = now();
