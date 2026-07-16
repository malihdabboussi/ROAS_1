-- Seed Agency Client (Webinar) space template (additive).
BEGIN;

INSERT INTO public.space_templates (
  id, slug, title, description, icon, icon_color, category, persona, badge,
  featured, is_new, schema, channel_name, channel_description, sort_order
)
VALUES
  (
    gen_random_uuid(),
    'agency-client-webinar',
    'Agency Client (Webinar)',
    'Fulfill a webinar client end-to-end — Missions playbook, strategy docs, copy package, creative pack, and a private channel.',
    'megaphone',
    'violet',
    'tier1_universal',
    'agency',
    'New',
    true,
    true,
    '{"version":1,"icon":"megaphone","fields":[{"id":"title","name":"Name","type":"text","system":true,"required":true},{"id":"status","name":"Status","type":"select","system":true,"required":true,"options":[{"id":"brief","label":"Brief","color":"slate","group":"not_started"},{"id":"in_progress","label":"In Progress","color":"amber","group":"active"},{"id":"review","label":"Review","color":"violet","group":"active"},{"id":"delivered","label":"Delivered","color":"cyan","group":"active"},{"id":"paid","label":"Paid","color":"emerald","group":"closed"}]},{"id":"priority","name":"Priority","type":"select","system":true,"required":true,"options":[{"id":"low","label":"Low","color":"slate"},{"id":"medium","label":"Medium","color":"blue"},{"id":"high","label":"High","color":"orange"},{"id":"urgent","label":"Urgent","color":"red"}]},{"id":"assignee","name":"Assignee","type":"assignee","system":true},{"id":"due_date","name":"Due Date","type":"date","system":true}],"views":[{"id":"missions","type":"missions","name":"Missions"},{"id":"deliverables","type":"kanban","name":"Deliverables","group_by":"status","visible_fields":["title","priority","assignee","due_date"]},{"id":"calendar","type":"calendar","name":"Calendar","date_field":"due_date"},{"id":"docs","type":"docs","name":"Docs"},{"id":"channel","type":"channel","name":"#client-comms"}]}'::jsonb,
    'client-comms',
    'Internal channel for this webinar client.',
    21
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
  updated_at = now();

DELETE FROM public.space_template_items
WHERE template_id IN (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar');

DELETE FROM public.space_template_automations
WHERE template_id IN (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar');

INSERT INTO public.space_template_items (
  template_id, kind, title, status, priority, description, body, custom_data, sort_order
)
VALUES
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'doc',
    'Welcome — how to run webinar fulfillment',
    NULL,
    'medium',
    NULL,
    '<h1>Welcome to your Agency Client (Webinar)</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Missions → Start playbook</strong> — run Webinar Fulfillment (strategy → gate → copy → creative)</li><li><strong>Deliverables (Kanban)</strong> — track brief → paid for client-facing packages</li><li><strong>Docs</strong> — Pre-Call map, Strategy v2, THE PLAN, Copy Package, Creative Pack</li><li><strong>Calendar</strong> — call dates and launch deadlines</li><li><strong>Channel</strong> — internal client comms</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>',
    '{}'::jsonb,
    0
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'doc',
    'Pre-Call Strategy Map',
    NULL,
    'medium',
    NULL,
    '<h2>Pre-Call Strategy Map</h2>
<p>Filled by the Webinar Fulfillment playbook (Phase A / skill 1).</p>
<ul><li>Suggested offers</li><li>Suggested avatars</li><li>Confirm-or-correct call agenda</li><li>Portal pre-fill notes</li></ul>',
    '{}'::jsonb,
    1
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'doc',
    'Strategy v2',
    NULL,
    'medium',
    NULL,
    '<h2>Strategy v2</h2>
<p>Post-call corrected strategy (Phase A / skill 2).</p>
<ul><li>What changed after the call</li><li>Locked offer + avatar</li><li>Constraints and proof</li></ul>',
    '{}'::jsonb,
    2
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'doc',
    'THE PLAN — Launch Brief',
    NULL,
    'medium',
    NULL,
    '<h2>THE PLAN</h2>
<p>Launch brief for production (Phase A / skill 3).</p>
<ul><li>Webinar promise</li><li>Funnel path</li><li>Asset list for copy + creative</li></ul>',
    '{}'::jsonb,
    3
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'doc',
    'Copy Package',
    NULL,
    'medium',
    NULL,
    '<h2>Copy Package</h2>
<p>Phase B (skills TBD) — topics, emails, Meta ads, scripts, landing page copy.</p>',
    '{}'::jsonb,
    4
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'doc',
    'Creative Pack',
    NULL,
    'medium',
    NULL,
    '<h2>Creative Pack</h2>
<p>Phase C (skills TBD) — static ads, theme images, landing visuals, deck.</p>',
    '{}'::jsonb,
    5
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'task',
    'Start Webinar Fulfillment playbook',
    'brief',
    'medium',
    'Open Missions → Start playbook → Webinar Fulfillment and fill kickoff fields.',
    NULL,
    '{}'::jsonb,
    6
  );

COMMIT;
