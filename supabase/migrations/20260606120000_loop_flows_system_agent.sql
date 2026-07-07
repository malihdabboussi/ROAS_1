-- Loop system agent for Flows V1.
-- DB rows remain the source of truth for system skills; no local-only skill file is seeded.

UPDATE public.agents_registry
   SET name = 'Loop',
       role = 'Flows Builder',
       skills = '["flow-builder", "vibey-api"]'::jsonb,
       status = 'idle',
       level = 'system',
       config = jsonb_build_object(
         'capability_profile', 'system_flows',
         'capability_domain', 'flows',
         'platform_managed', true,
         'model_id', 'auto'
       ),
       is_system = true,
       is_active = true,
       updated_at = now()
 WHERE user_id IS NULL
   AND org_id IS NULL
   AND agent_key = 'loop';

INSERT INTO public.agents_registry (
  user_id,
  org_id,
  agent_key,
  name,
  role,
  skills,
  status,
  level,
  config,
  is_system,
  is_active
)
SELECT
  NULL,
  NULL,
  'loop',
  'Loop',
  'Flows Builder',
  '["flow-builder", "vibey-api"]'::jsonb,
  'idle',
  'system',
  jsonb_build_object(
    'capability_profile', 'system_flows',
    'capability_domain', 'flows',
    'platform_managed', true,
    'model_id', 'auto'
  ),
  true,
  true
WHERE NOT EXISTS (
  SELECT 1
    FROM public.agents_registry
   WHERE user_id IS NULL
     AND org_id IS NULL
     AND agent_key = 'loop'
);

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
  'Plan, draft, validate, and publish Space automation flows using existing supported triggers and actions.',
  $skill$# Flow Builder

Use this skill whenever the user wants to create, edit, inspect, validate, or publish a Space automation flow.

## Protocol

1. Search flow capabilities before drafting or editing a flow.
2. Use only existing supported triggers and actions from the capability catalog.
3. Ask for missing required fields before saving when the user has not supplied enough detail.
4. Save new work as disabled drafts with `create_flow_draft`; update existing drafts with `update_flow_draft`.
5. Validate drafts with `validate_flow_draft` before publishing.
6. Publish only with `publish_flow` after validation succeeds.
7. If `publish_flow` says backend sync is required, stop and send the admin to `/flows` to publish so schedules, connected-app routes, external routes, and contact routes sync correctly.
8. Never invent unsupported triggers, actions, fields, connected-app events, or custom reusable actions.
9. Keep work scoped to the active Space unless the user explicitly chooses another Space.

## Tools

- `search_flow_capabilities`: bounded capability search by query, category, kind, and cursor.
- `get_flow_capability`: inspect required fields, compatibility notes, and examples for one capability.
- `list_flows`: list Space automations as flows.
- `get_flow`: inspect one flow.
- `create_flow_draft`: create a disabled draft.
- `update_flow_draft`: edit a disabled draft.
- `validate_flow_draft`: check a draft or candidate flow before publish.
- `publish_flow`: enable and publish a valid draft.

## Guardrails

- If the catalog does not contain a requested capability, say it is not supported in V1.
- If required fields depend on the user's custom statuses, labels, form fields, accounts, or connected apps, ask for the exact values.
- Schedule, connected-app/external, and contact trigger publishing must run through the admin Flows UI/API when `publish_flow` refuses direct publish.
- Do not create custom reusable action definitions in V1.
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
