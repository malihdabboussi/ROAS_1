-- Align Loop flow-builder skill with pre-plan create_flow_clarification protocol.

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
  'Plan, draft, validate, evaluate, and publish Space automation flows. Use when the user mentions flows, automations, triggers, Loop builds, or asks to create or update a Space workflow.',
  $skill$# Flow Builder

Use this skill when the user wants to create, edit, inspect, validate, evaluate, or publish a Space automation flow.

## Operating Model

- The app/server harness owns the active Space, active Flow build session, and selected update target.
- Loop builds flows; Loop does not ask for, mention, copy, or manually manage session IDs.
- In `/flows`, continuation actions can omit `session_id`; the backend attaches the active build session for `update_flow_plan`, `answer_flow_clarification`, `validate_flow_plan`, `compile_flow_plan`, and `evaluate_flow_plan`.
- Call Flow actions through the runtime backend tool (`campaign_capability` or `vibey_backend`) using `action`, `label`, and `data`.
- When the user chose "Update a Flow", inspect the selected flow with `get_flow` before editing.

## Protocol

1. Load Space context with `get_flow_build_context`.
2. Search capabilities with `search_flow_capabilities`; use `get_flow_capability` for exact required fields.
3. Resolve platform IDs from build context and exact list/get actions. Ask for labels or intent, not internal IDs.
4. When a human choice still affects execution, call `create_flow_clarification` before `create_flow_plan`. The Flows UI renders those questions in chat (three or fewer) or the Clarifications tab (four or more). Chat prose is not a substitute — only the tool persists questions the user can answer in Flows.
5. After clarifications are answered or unnecessary, call `create_flow_plan`, then `update_flow_plan`, `validate_flow_plan`, `compile_flow_plan`, and `evaluate_flow_plan` for non-trivial builds.
6. Prefer premade capabilities before custom blueprints.
7. Custom blueprints must compile to supported automation action payloads.
8. Publish only after `validate_flow_draft` succeeds.

## Clarification

Call `create_flow_clarification` when any unresolved choice changes what the flow does:

- Which status, field, tag, agent, account, form, channel, schedule, or recipient applies
- How to interpret behavioral conditions such as "no next step" when the Space has no dedicated field
- Whether to create a new flow or update an existing draft

Do not put `clarification_questions` on plans — that path is retired. Do not use generic `ask_clarification` for Flow builds.

Even when the user says "ask me questions first", still call `create_flow_clarification`. A one-line intro in chat is fine; the structured questions belong in the tool payload.

Question shape: `id`, `text`, `type` (`single_choice`, `multi_choice`, or `text`), `options` for choice types, `required`.

**Example — ambiguous trigger status:**

```json
{"action":"create_flow_clarification","label":"Clarifying Flow choices","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","title":"Which status means Done?","questions":[{"id":"done_status","text":"Which status should trigger this flow?","type":"single_choice","options":[{"id":"done","label":"Done"},{"id":"in_review","label":"FIXED - Not PUSHED"}],"required":true}]}}
```

**Example — user asks for four questions before planning:**

```json
{"action":"create_flow_clarification","label":"Clarifying Flow choices","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","title":"A few Flow choices","questions":[{"id":"build_mode","text":"Create a new flow or update the existing draft?","type":"single_choice","options":[{"id":"new","label":"New flow"},{"id":"update","label":"Update existing draft"}],"required":true},{"id":"done_status","text":"Which status counts as Done?","type":"single_choice","options":[{"id":"done","label":"Done"}],"required":true},{"id":"next_step_rule","text":"How should the flow detect no next step?","type":"single_choice","options":[{"id":"agent_judgment","label":"Agent judges from title and notes"},{"id":"linked_tasks","label":"No linked tasks"}],"required":true},{"id":"followup_priority","text":"What priority should follow-up tasks use?","type":"single_choice","options":[{"id":"medium","label":"Medium"},{"id":"high","label":"High"}],"required":true}]}}
```

After answers arrive, continue with `answer_flow_clarification` if needed, then `create_flow_plan`.

## Backend Actions

Call these through `campaign_capability` or `vibey_backend`:

- `get_flow_build_context`: load scoped Space facts, fields, options, flows, tokens, and capability summary.
- `search_flow_capabilities`: bounded capability search by query, category, kind, and cursor.
- `get_flow_capability`: inspect required fields, compatibility notes, and examples for one capability.
- `list_flows`: list Space automations as flows.
- `get_flow`: inspect one flow before editing.
- `create_flow_clarification`: persist pre-plan human choices before planning.
- `create_flow_plan`: create a new chat-started plan or fill a server-started placeholder session.
- `update_flow_plan`: update the active plan.
- `answer_flow_clarification`: apply clarification answers to the active build session.
- `validate_flow_plan`: validate the active plan.
- `compile_flow_plan`: compile the active plan into a disabled `space_automations` draft.
- `evaluate_flow_plan`: record build quality metrics.
- `list_flow_blueprints`, `get_flow_blueprint`, `create_flow_blueprint_draft`, `validate_flow_blueprint`, `activate_flow_blueprint`: reusable custom steps.
- `create_flow_draft`, `update_flow_draft`, `validate_flow_draft`, `publish_flow`: direct draft management and publish.

## Guardrails

- Do not ask users for internal IDs in chat. Resolve IDs automatically or capture label-based choices through `create_flow_clarification`.
- Do not abandon an active build. If validation or compile fails, update the plan or add clarifications, then retry.
- Do not create custom action definitions that execute outside supported automation payloads.
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
