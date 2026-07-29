-- Upgrade Delegation Desk from packet-centric intake to a durable outstanding-work queue.
BEGIN;

DO $$
DECLARE
  desk_schema jsonb := $schema$
  {
    "version": 1,
    "icon": "send-horizontal",
    "delegation_desk": true,
    "fields": [
      {"id":"title","name":"Name","type":"text","system":true,"required":true},
      {"id":"status","name":"Status","type":"select","system":true,"required":true,"options":[
        {"id":"inbox","label":"Holding tank","color":"slate","group":"not_started"},
        {"id":"processing","label":"Organizing","color":"cyan","group":"active"},
        {"id":"ready_review","label":"Ready to delegate","color":"violet","group":"active"},
        {"id":"approved","label":"Approved","color":"blue","group":"active"},
        {"id":"dispatched","label":"Delegated","color":"emerald","group":"active"},
        {"id":"in_progress","label":"In progress","color":"cyan","group":"active"},
        {"id":"done","label":"Done","color":"emerald","group":"closed"},
        {"id":"blocked","label":"Blocked","color":"red","group":"active"},
        {"id":"dismissed","label":"Dismissed","color":"slate","group":"closed"}
      ]},
      {"id":"intake_type","name":"Type","type":"select","options":[
        {"id":"work_item","label":"Work item","color":"blue"},
        {"id":"work_group","label":"Work group","color":"violet"}
      ]},
      {"id":"dispatch_mode","name":"Dispatch Mode","type":"select","options":[
        {"id":"batch","label":"Batch","color":"blue"},
        {"id":"review","label":"Review first","color":"violet"},
        {"id":"urgent","label":"Urgent","color":"red"}
      ]},
      {"id":"destination","name":"Destination","type":"select","options":[
        {"id":"human","label":"Team member","color":"blue"},
        {"id":"agent","label":"Agent","color":"violet"},
        {"id":"roas_portal","label":"The ROAS Portal","color":"emerald"},
        {"id":"review","label":"Needs review","color":"amber"}
      ]},
      {"id":"client_campaign","name":"Client / Campaign","type":"text"},
      {"id":"priority","name":"Priority","type":"select","system":true,"required":true,"options":[
        {"id":"low","label":"Low","color":"slate"},
        {"id":"medium","label":"Medium","color":"blue"},
        {"id":"high","label":"High","color":"orange"},
        {"id":"urgent","label":"Urgent","color":"red"}
      ]},
      {"id":"assignee","name":"Assignee","type":"assignee","system":true},
      {"id":"due_date","name":"Due Date","type":"date","system":true}
    ],
    "views": [
      {"id":"inbox","type":"list","name":"Holding tank","field_value_filters":{"status":"inbox"},"visible_fields":["title","dispatch_mode","priority","client_campaign","due_date"]},
      {"id":"review","type":"list","name":"Ready to delegate","field_value_filters":{"status":"ready_review"},"visible_fields":["title","destination","assignee","priority","client_campaign","due_date"]},
      {"id":"urgent","type":"list","name":"Urgent","field_value_filters":{"dispatch_mode":"urgent"},"visible_fields":["status","title","destination","assignee","due_date"]},
      {"id":"pipeline","type":"kanban","name":"Pipeline","group_by":"status","visible_fields":["title","priority","assignee","due_date"]},
      {"id":"dispatched","type":"list","name":"Delegated","field_value_filters":{"status":"dispatched"},"visible_fields":["title","destination","assignee","client_campaign","due_date"]},
      {"id":"completed","type":"list","name":"Completed","field_value_filters":{"status":"done"},"visible_fields":["title","destination","assignee","client_campaign","due_date"]},
      {"id":"operating-notes","type":"docs","name":"Operating notes"}
    ]
  }
  $schema$::jsonb;
  process_actions jsonb := $actions$
  [
    {
      "type": "send_to_agent",
      "agent_key": "vibey",
      "output_type": "none",
      "prompt_template": "Process this Delegation Desk intake using the delegation-desk skill.\nDo not assign raw intake directly to the team.\nRead the delegation metadata and every referenced source item before deciding.\nTurn the intake into clear work items. Use a parent work group with subtasks only when related items benefit from staying together.\nFor urgent mode, dispatch in this run after the required identity, duplicate, and destination checks.\nFor batch or review mode, leave prepared work items in Ready to delegate unless the intake explicitly authorizes dispatch.\nRecord durable task, agent-delegation, or The ROAS Portal receipts before marking anything Delegated."
    }
  ]
  $actions$::jsonb;
BEGIN
  UPDATE public.space_templates
  SET
    description = 'Private holding tank for commitments, action items, promises, and suggested work before it is assigned to the team.',
    schema = desk_schema,
    updated_at = now()
  WHERE slug = 'delegation-desk';

  UPDATE public.spaces AS desk
  SET
    description = 'Private holding tank for commitments, action items, promises, and suggested work before it is assigned to the team.',
    schema =
      (COALESCE(desk.schema, '{}'::jsonb) || (desk_schema - 'fields' - 'views'))
      || jsonb_build_object(
        'fields',
        (
          SELECT jsonb_agg(merged_field.value)
          FROM (
            SELECT existing_field.value
            FROM jsonb_array_elements(COALESCE(desk.schema -> 'fields', '[]'::jsonb)) AS existing_field
            WHERE existing_field.value ->> 'id' NOT IN (
              SELECT template_field.value ->> 'id'
              FROM jsonb_array_elements(desk_schema -> 'fields') AS template_field
            )
            UNION ALL
            SELECT template_field.value
            FROM jsonb_array_elements(desk_schema -> 'fields') AS template_field
          ) AS merged_field
        ),
        'views',
        (
          SELECT jsonb_agg(merged_view.value)
          FROM (
            SELECT existing_view.value
            FROM jsonb_array_elements(COALESCE(desk.schema -> 'views', '[]'::jsonb)) AS existing_view
            WHERE existing_view.value ->> 'id' NOT IN (
              SELECT template_view.value ->> 'id'
              FROM jsonb_array_elements(desk_schema -> 'views') AS template_view
            )
            UNION ALL
            SELECT template_view.value
            FROM jsonb_array_elements(desk_schema -> 'views') AS template_view
          ) AS merged_view
        )
      ),
    updated_at = now()
  WHERE desk.schema ->> 'delegation_desk' = 'true';

  UPDATE public.space_template_items
  SET body = '<h1>Delegation Desk</h1><p>Capture outstanding work here before it becomes a team assignment.</p><h2>The workflow</h2><ul><li>Holding tank contains private, unassigned work captured from calls, chats, and selected tasks.</li><li>Pixel checks duplicates, researches context, and turns rough intake into clear work items.</li><li>Ready to delegate contains work that needs an owner or destination.</li><li>Related work can use a parent work group with individual subtasks.</li><li>Urgent intake can delegate immediately after required checks.</li><li>Delegated work remains tracked until Done.</li></ul><h2>Quality bar</h2><ul><li>One accountable owner per delegated work item.</li><li>State the outcome, why it matters, scope, and done-when criteria.</li><li>Preserve the original source without copying rough language into the team brief.</li><li>Update existing work instead of creating duplicates.</li></ul>'
  WHERE template_id = (SELECT id FROM public.space_templates WHERE slug = 'delegation-desk')
    AND kind = 'doc'
    AND title = 'Welcome — how to use the Delegation Desk';

  UPDATE public.space_template_automations
  SET actions = process_actions
  WHERE template_id = (SELECT id FROM public.space_templates WHERE slug = 'delegation-desk')
    AND name = 'Process delegation intake';

  UPDATE public.space_automations automation
  SET actions = process_actions
  FROM public.spaces desk
  WHERE automation.space_id = desk.id
    AND desk.schema ->> 'delegation_desk' = 'true'
    AND automation.name = 'Process delegation intake';

  UPDATE public.space_items item
  SET custom_data = jsonb_set(
    COALESCE(item.custom_data, '{}'::jsonb),
    '{intake_type}',
    to_jsonb(
      CASE item.custom_data ->> 'intake_type'
        WHEN 'packet' THEN 'work_group'
        ELSE 'work_item'
      END
    ),
    true
  )
  FROM public.spaces desk
  WHERE item.space_id = desk.id
    AND desk.schema ->> 'delegation_desk' = 'true'
    AND item.custom_data ->> 'intake_type' IN ('signal', 'packet');
END
$$;

INSERT INTO public.agent_skills (
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source,
  user_id,
  org_id
)
VALUES (
  'vibey',
  'delegation-desk',
  'Delegation Desk',
  'Maintains a private holding tank of commitments, action items, promises, and selected work; prepares clear work items or parent work groups, then routes approved or urgent work to humans, managed agents, or The ROAS Portal.',
  $skillbody$# Delegation Desk

Capture outstanding work in one private holding tank before it becomes an assignment. Use this skill when work arrives from the Delegation Desk, when a call or chat produces commitments, when the user asks Pixel to organize a brain dump, or when selected Space tasks need planning before delegation.

## Goal

Give the user a complete, reviewable list of work that still needs to happen. Preserve the source and deadline, clarify what done means, and keep each item unassigned until its owner and destination are known.

## Work model

- A **work item** is one trackable outcome.
- A **work group** is an optional parent for related work items that should stay together.
- A work group is not an opaque document. Its executable parts are subtasks with their own owner, due date, status, and completion record.
- Work may remain in the holding tank without an assignee or client Space. That is expected planning state, not an error.

Read the current task and its `custom_data.delegation` metadata:

- `mode`: `batch`, `review`, or `urgent`
- `source_space_id` and `source_item_ids`: source work to read before planning
- `source_fingerprint`: stable identity for duplicate detection
- `note`: additional user context

Raw intake is private evidence. Do not assign it directly, copy rough language into a team brief, or notify the team merely because it was captured.

## Processing method

1. Move new intake from Holding tank to Organizing.
2. Read every referenced source item and relevant call, chat, client, campaign, and Person Brain context.
3. Search for open Desk work and destination tasks with the same fingerprint, source ids, or outcome. Update existing work instead of duplicating it.
4. Create the smallest clear set of work items. Use a work group only when subtasks share one outcome or delivery sequence.
5. Give every work item:
   - desired outcome
   - why it matters
   - source links or evidence
   - scope
   - done-when criteria
   - due date or urgency when known
   - client or campaign when resolved
   - one focused open question only when it blocks delegation
6. Preserve source ids and the intake id in `custom_data.delegation`.
7. Leave unassigned planning work in Ready to delegate. Route it only after the owner and destination are resolved.

## Dispatch modes

### Batch

Look for other unprocessed intake in this Delegation Desk that belongs to the same client, campaign, outcome, or workstream. Consolidate only when that makes the work easier to execute. Create or update work items and leave them Ready to delegate.

### Review

Process only the current intake and directly referenced work. Create or update finished work items and leave them Ready to delegate. Do not delegate until the user approves them.

### Urgent

Check identity, duplicates, client or campaign, destination, and required context without waiting for a batch window. Delegate coherent work in the same run. Stop only when a required selector is unresolved or delegation would create material ambiguity. Leave a blocked work item with one focused question when that happens.

Urgent mode authorizes internal work routing. It does not authorize publishing, spending money, contacting an external person, or bypassing an existing approval gate.

## Destination routing

- Human teammate: create or update a durable task with `assignee_type:"human"` and the resolved human owner.
- Managed AI agent: use `delegate_to_agent` with the complete work brief. Use `ask_agent` only for read-only help.
- Funnel, landing page, campaign page, or fulfillment work: follow the `page-grader-operator` skill and create confirmed work in The ROAS Portal.
- Ambiguous, sensitive, or externally impactful work: leave the work item Ready to delegate or Blocked.

Do not report Delegated until the destination tool returns a durable task, delegation, or fulfillment record. Store that receipt on the Desk item and source intake. Keep delegated work in progress until completion is verified; then mark it Done.

## Completion

Update the intake task:

- `dispatched` when every authorized work item has a confirmed destination receipt
- `ready_review` when work is prepared but approval or an owner is required
- `blocked` when a required selector is unresolved
- `dismissed` when every source was already completed, duplicated, or intentionally declined

Return one concise receipt in the intake activity:

`Captured {source count} sources → {work item count} work items. {delegated count} delegated, {review count} ready to delegate, {blocked count} blocked.`

Name owners or destinations only when resolved.

## Examples

**Selected tasks, review first**

Input: Five selected tasks include two website fixes for one client, two email revisions for the same campaign, and one reporting question. Mode is `review`.

Result: Create three work items, preserve all five source ids, and leave them Ready to delegate. If two website fixes share one outcome, use one work group with two subtasks. Do not assign the five raw tasks or send five notifications.

**Urgent website replacement**

Input: “The current site is outdated. We already have the webinar landing page. Replace it today.” Mode is `urgent`, and the client plus source page are resolved.

Result: Check for existing website work, create one clear fulfillment work item, send the confirmed request to The ROAS Portal, store its receipt, and respond with one short confirmation. Do not expose internal Page Grader terminology.

**Unmapped promise from a call**

Input: A meeting recap says, “We will send the revised budget by Friday,” but no owner or client Space is resolved.

Result: Create an unassigned work item in Ready to delegate with Friday as its due date, the recording as evidence, and one focused owner question. Keep it visible in the Desk until it is delegated or dismissed.
$skillbody$,
  true,
  'system',
  NULL,
  NULL
)
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = EXCLUDED.is_enabled,
  source = EXCLUDED.source,
  updated_at = now();

COMMIT;
