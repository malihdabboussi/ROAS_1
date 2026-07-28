-- Seed the private Delegation Desk intake template and its Pixel processing automation.
BEGIN;

INSERT INTO public.space_templates (
  id, slug, title, description, icon, icon_color, category, persona, badge,
  featured, is_new, schema, channel_name, channel_description, sort_order
)
VALUES (
  gen_random_uuid(),
  'delegation-desk',
  'Delegation Desk',
  'Private intake for brain dumps and selected work. Pixel consolidates each batch into concise, reviewable delegation packets before the team sees it.',
  'send-horizontal',
  'violet',
  'tier1_universal',
  'ops',
  'New',
  true,
  true,
  $schema$
  {
    "version": 1,
    "icon": "send-horizontal",
    "delegation_desk": true,
    "fields": [
      {"id":"title","name":"Name","type":"text","system":true,"required":true},
      {"id":"status","name":"Status","type":"select","system":true,"required":true,"options":[
        {"id":"inbox","label":"Inbox","color":"slate","group":"not_started"},
        {"id":"processing","label":"Processing","color":"cyan","group":"active"},
        {"id":"ready_review","label":"Ready for review","color":"violet","group":"active"},
        {"id":"approved","label":"Approved","color":"blue","group":"active"},
        {"id":"dispatched","label":"Dispatched","color":"emerald","group":"closed"},
        {"id":"blocked","label":"Blocked","color":"red","group":"active"},
        {"id":"dismissed","label":"Dismissed","color":"slate","group":"closed"}
      ]},
      {"id":"intake_type","name":"Type","type":"select","options":[
        {"id":"signal","label":"Raw intake","color":"slate"},
        {"id":"packet","label":"Delegation packet","color":"violet"}
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
      {"id":"inbox","type":"list","name":"Inbox","field_value_filters":{"status":"inbox"},"visible_fields":["title","dispatch_mode","priority","client_campaign","due_date"]},
      {"id":"review","type":"list","name":"Review","field_value_filters":{"status":"ready_review"},"visible_fields":["title","destination","assignee","priority","client_campaign","due_date"]},
      {"id":"urgent","type":"list","name":"Urgent","field_value_filters":{"dispatch_mode":"urgent"},"visible_fields":["status","title","destination","assignee","due_date"]},
      {"id":"pipeline","type":"kanban","name":"Pipeline","group_by":"status","visible_fields":["title","priority","assignee","due_date"]},
      {"id":"dispatched","type":"list","name":"Dispatched","field_value_filters":{"status":"dispatched"},"visible_fields":["title","destination","assignee","client_campaign","due_date"]},
      {"id":"operating-notes","type":"docs","name":"Operating notes"}
    ]
  }
  $schema$::jsonb,
  NULL,
  NULL,
  15
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  icon_color = EXCLUDED.icon_color,
  category = EXCLUDED.category,
  persona = EXCLUDED.persona,
  badge = EXCLUDED.badge,
  featured = EXCLUDED.featured,
  is_new = EXCLUDED.is_new,
  schema = EXCLUDED.schema,
  channel_name = EXCLUDED.channel_name,
  channel_description = EXCLUDED.channel_description,
  sort_order = EXCLUDED.sort_order,
  is_published = true,
  updated_at = now();

DELETE FROM public.space_template_items
WHERE template_id = (SELECT id FROM public.space_templates WHERE slug = 'delegation-desk');

DELETE FROM public.space_template_automations
WHERE template_id = (SELECT id FROM public.space_templates WHERE slug = 'delegation-desk');

INSERT INTO public.space_template_items (
  template_id, kind, title, status, priority, description, body, custom_data, sort_order
)
VALUES (
  (SELECT id FROM public.space_templates WHERE slug = 'delegation-desk'),
  'doc',
  'Welcome — how to use the Delegation Desk',
  NULL,
  'medium',
  NULL,
  '<h1>Delegation Desk</h1><p>Capture rough ideas here without turning each thought into a team assignment.</p><h2>The workflow</h2><ul><li>Inbox contains private raw intake.</li><li>Pixel reads source tasks, checks duplicates, researches context, and consolidates related work.</li><li>Review contains human-readable Delegation Packets.</li><li>Urgent intake can dispatch immediately after required checks.</li><li>Dispatched work includes durable assignment or fulfillment receipts.</li></ul><h2>Quality bar</h2><ul><li>One accountable owner per packet.</li><li>State the outcome, why it matters, scope, and done-when criteria.</li><li>Preserve the original source without copying rough language into the team brief.</li><li>Update existing work instead of creating duplicates.</li></ul>',
  '{}'::jsonb,
  0
);

INSERT INTO public.space_template_automations (
  template_id, name, trigger, actions, sort_order
)
VALUES (
  (SELECT id FROM public.space_templates WHERE slug = 'delegation-desk'),
  'Process delegation intake',
  '{"type":"task_created","in_status":"inbox","is_subtask":false}'::jsonb,
  $actions$
  [
    {
      "type": "send_to_agent",
      "agent_key": "vibey",
      "output_type": "none",
      "prompt_template": "Process this Delegation Desk intake using the delegation-desk skill.\nDo not assign raw intake directly to the team.\nRead the delegation metadata and every referenced source item before deciding.\nDeduplicate and consolidate related work into the fewest coherent delegation packets.\nFor urgent mode, dispatch in this run after the required identity, duplicate, and destination checks.\nFor batch or review mode, prepare concise packets and leave them in Ready for review unless the intake explicitly authorizes dispatch.\nRecord durable task, agent-delegation, or The ROAS Portal receipts before marking anything Dispatched."
    }
  ]
  $actions$::jsonb,
  0
);

COMMIT;
