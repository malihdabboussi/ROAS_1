-- Seed CEO HQ + Meetings space templates (additive).
BEGIN;

INSERT INTO public.space_templates (
  id, slug, title, description, icon, icon_color, category, persona, badge,
  featured, is_new, schema, channel_name, channel_description, sort_order
)
VALUES
  (
    gen_random_uuid(),
    'ceo-hq',
    'CEO HQ',
    'Personal command center — Today, priorities, calendar, draft replies, and morning/EOD loops. Always draft, never send.',
    'crown',
    'amber',
    'tier1_universal',
    'founder',
    'New',
    true,
    true,
    '{"version":1,"icon":"crown","fields":[{"id":"title","name":"Name","type":"text","system":true,"required":true},{"id":"status","name":"Status","type":"select","system":true,"required":true,"options":[{"id":"inbox","label":"Inbox","color":"slate","group":"not_started"},{"id":"today","label":"Today","color":"amber","group":"active"},{"id":"waiting","label":"Waiting","color":"violet","group":"active"},{"id":"done","label":"Done","color":"emerald","group":"closed"}]},{"id":"priority","name":"Priority","type":"select","system":true,"required":true,"options":[{"id":"low","label":"Low","color":"slate"},{"id":"medium","label":"Medium","color":"blue"},{"id":"high","label":"High","color":"orange"},{"id":"urgent","label":"Urgent","color":"red"}]},{"id":"assignee","name":"Assignee","type":"assignee","system":true},{"id":"due_date","name":"Due Date","type":"date","system":true}],"views":[{"id":"today","type":"list","name":"Today","visible_fields":["title","status","priority","assignee","due_date"]},{"id":"priorities","type":"kanban","name":"Priorities","group_by":"status","visible_fields":["title","priority","assignee","due_date"]},{"id":"calendar","type":"calendar","name":"Calendar","date_field":"due_date"},{"id":"missions","type":"missions","name":"Missions"},{"id":"drafts","type":"emails","name":"Drafts","icon":"mail","emails_config":{"display_mode":"grid","time_range":"all","sort_by":"created_at","sort_dir":"desc"}},{"id":"notes","type":"docs","name":"Notes"},{"id":"channel","type":"channel","name":"#ceo-hq"}]}'::jsonb,
    'ceo-hq',
    'Daily brief and EOD close with Vibey.',
    5
  ),
  (
    gen_random_uuid(),
    'meetings',
    'Meetings',
    'Every call in one place — who, details, acronyms, transcript link, and follow-ups from Fathom.',
    'video',
    'blue',
    'tier1_universal',
    'founder',
    'Needs Fathom',
    true,
    true,
    '{"version":1,"icon":"video","fields":[{"id":"title","name":"Name","type":"text","system":true,"required":true},{"id":"status","name":"Status","type":"select","system":true,"required":true,"options":[{"id":"logged","label":"Logged","color":"slate","group":"not_started"},{"id":"needs_follow_up","label":"Needs follow-up","color":"amber","group":"active"},{"id":"waiting","label":"Waiting","color":"violet","group":"active"},{"id":"closed","label":"Closed","color":"emerald","group":"closed"}]},{"id":"priority","name":"Priority","type":"select","system":true,"required":true,"options":[{"id":"low","label":"Low","color":"slate"},{"id":"medium","label":"Medium","color":"blue"},{"id":"high","label":"High","color":"orange"},{"id":"urgent","label":"Urgent","color":"red"}]},{"id":"assignee","name":"Assignee","type":"assignee","system":true},{"id":"due_date","name":"Due Date","type":"date","system":true}],"views":[{"id":"all-meetings","type":"list","name":"All Meetings","visible_fields":["title","status","priority","assignee","due_date"]},{"id":"follow-ups","type":"kanban","name":"Follow-ups","group_by":"status","visible_fields":["title","priority","assignee","due_date"]},{"id":"calendar","type":"calendar","name":"Calendar","date_field":"due_date"},{"id":"meeting-logs","type":"docs","name":"Meeting Logs"},{"id":"people","type":"contacts","name":"People"},{"id":"missions","type":"missions","name":"Missions"}]}'::jsonb,
    NULL,
    NULL,
    6
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
WHERE template_id IN (SELECT id FROM public.space_templates WHERE slug IN ('ceo-hq', 'meetings'));

DELETE FROM public.space_template_automations
WHERE template_id IN (SELECT id FROM public.space_templates WHERE slug IN ('ceo-hq', 'meetings'));

INSERT INTO public.space_template_items (
  template_id, kind, title, status, priority, description, body, custom_data, sort_order
)
VALUES
  (
    (SELECT id FROM public.space_templates WHERE slug = 'ceo-hq'),
    'doc',
    'Welcome — how to run CEO HQ',
    NULL,
    'medium',
    NULL,
    '<h1>Welcome to your CEO HQ</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Today (List)</strong> — only decisions you must make today (cap ~7)</li><li><strong>Priorities (Board)</strong> — Inbox → Today → Waiting → Done</li><li><strong>Calendar</strong> — deadlines and prep tied to due dates</li><li><strong>Missions</strong> — multi-step agent work (Slack audit, deep prep)</li><li><strong>Drafts (Emails)</strong> — Slack/email replies waiting for your approval — never auto-sent</li><li><strong>Notes</strong> — operating rules, acronyms, decision log</li><li><strong>Channel</strong> — morning brief + EOD close with Vibey</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>',
    '{}'::jsonb,
    0
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'ceo-hq'),
    'doc',
    'Operating rules — always draft',
    NULL,
    'medium',
    NULL,
    '<h2>Draft-only rule</h2>
<p>Vibey and every agent in this space <strong>draft</strong> Slack replies and emails.</p>
<p>Nothing goes out until you approve.</p>
<h2>Today rule</h2>
<p>If it is not a decision, relationship, money, hire/fire, or unblock — it should not sit on Today.</p>
<p>Delegate, park on Waiting, or give it to an agent.</p>
<h2>Morning loop</h2>
<ul><li>Slack audit</li><li>Calendar scan</li><li>Draft replies queued in Drafts</li><li>Today list locked</li></ul>
<h2>End-of-day close</h2>
<ul><li>What moved</li><li>Waiting nudges (drafted)</li><li>Tomorrow pre-built</li></ul>',
    '{}'::jsonb,
    1
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'ceo-hq'),
    'task',
    'Connect Slack on your personal account',
    'inbox',
    'high',
    'CEO HQ Slack audit runs on personal account. Map Vibey to the channels you care about, then enable the Morning CEO Brief flow.',
    NULL,
    '{}'::jsonb,
    2
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'ceo-hq'),
    'task',
    'Enable Morning CEO Brief + EOD Close flows',
    'inbox',
    'high',
    'Automations install as drafts. Open Flows, set timezone if needed, then publish Morning CEO Brief and End of Day Close.',
    NULL,
    '{}'::jsonb,
    3
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'ceo-hq'),
    'task',
    'Pin this space and set it as your daily driver',
    'today',
    'medium',
    'Right-click in the sidebar to pin. Use Meetings space for Fathom call logs.',
    NULL,
    '{}'::jsonb,
    4
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'meetings'),
    'doc',
    'Welcome — how to use Meetings',
    NULL,
    'medium',
    NULL,
    '<h1>Welcome to your Meetings</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>All Meetings (List)</strong> — one row per call (who, status, due follow-ups)</li><li><strong>Follow-ups (Board)</strong> — Logged → Needs follow-up → Waiting → Closed</li><li><strong>Calendar</strong> — call-tied due dates</li><li><strong>Meeting Logs (Docs)</strong> — full write-ups, acronyms, decisions, transcript link</li><li><strong>People</strong> — attendees you keep working with</li><li><strong>Missions</strong> — deeper agent work spun from a call</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>',
    '{}'::jsonb,
    0
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'meetings'),
    'doc',
    'Meeting log template',
    NULL,
    'medium',
    NULL,
    '<h2>Meeting</h2>
<ul><li>Title</li><li>Date</li><li>Who was there</li><li>Transcript / Fathom link</li></ul>
<h2>Purpose</h2>
<ul><li>Why this call existed</li></ul>
<h2>Details</h2>
<ul><li>What was discussed</li><li>Decisions made</li></ul>
<h2>Acronyms / jargon</h2>
<ul><li>TERM — plain-English meaning</li></ul>
<h2>Commitments</h2>
<ul><li>Owner — action — due date</li></ul>
<h2>Open questions</h2>
<ul><li>What still needs an answer</li></ul>',
    '{}'::jsonb,
    1
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'meetings'),
    'task',
    'Connect Fathom on your personal account',
    'logged',
    'high',
    'Enable the Fathom Meeting Log flow after connect. New recordings create a meeting row, a log doc, and follow-up suggestions.',
    NULL,
    '{}'::jsonb,
    2
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'meetings'),
    'task',
    'Backfill last week of calls once',
    'needs_follow_up',
    'medium',
    'Pull recent Fathom meetings into Brain or this space so Meetings is not empty on day one.',
    NULL,
    '{}'::jsonb,
    3
  );

INSERT INTO public.space_template_automations (
  template_id, name, trigger, actions, sort_order
)
VALUES
  (
    (SELECT id FROM public.space_templates WHERE slug = 'ceo-hq'),
    'Morning CEO Brief',
    '{"type":"schedule","schedule":{"mode":"preset","preset":"daily","time":"07:30"},"timezone":"America/Los_Angeles"}'::jsonb,
    '[{"type":"create_task","title_template":"Morning brief — {{trigger.fired_at}}","status":"today","priority":"high","assignees":[{"type":"agent","id":"vibey"}],"notes_template":"Daily CEO brief for this space. Cover Slack audit, calendar, Today priorities, and draft-only reply queue."},{"type":"send_to_agent","agent_key":"vibey","target_item_ref":"{{steps.1.item_id}}","output_type":"none","prompt_template":"You are running the morning CEO brief for this personal HQ space.\nCRITICAL RULE: Always draft replies and emails. Never send Slack messages, emails, or DMs. Leave drafts for human approval.\n\nDo this:\n1. Slack audit — scan connected Slack. Pull must-reply items, risks, and FYIs.\n2. For every must-reply, DRAFT a Slack or email response (do not send). Attach drafts as email artifacts or comments.\n3. Build Today — at most 7 decision-owner items for the human. Move or suggest everything else to Waiting / teammate / agent.\n4. Calendar — what is on today and what prep is missing.\n5. Write a short brief on this task with: Priorities, Drafts ready for approval, Waiting >48h, Risks.\n\nFired at: {{trigger.fired_at}}"}]'::jsonb,
    0
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'ceo-hq'),
    'End of Day Close',
    '{"type":"schedule","schedule":{"mode":"preset","preset":"daily","time":"17:30"},"timezone":"America/Los_Angeles"}'::jsonb,
    '[{"type":"create_task","title_template":"EOD close — {{trigger.fired_at}}","status":"today","priority":"medium","assignees":[{"type":"agent","id":"vibey"}],"notes_template":"End-of-day close. What moved, what waits, what rolls to tomorrow, and any leftover draft replies."},{"type":"send_to_agent","agent_key":"vibey","target_item_ref":"{{steps.1.item_id}}","output_type":"none","prompt_template":"You are closing the CEO day for this personal HQ space.\nCRITICAL RULE: Always draft replies and emails. Never send Slack messages, emails, or DMs. Leave drafts for human approval.\n\nDo this:\n1. What moved today vs what stalled.\n2. Waiting list — anything >48h that needs a nudge (draft the nudge, do not send).\n3. Roll unfinished Today items into a clear tomorrow list (keep Today decision-only).\n4. Any leftover Slack/email replies still needing a draft.\n5. Comment a short EOD summary on this task.\n\nFired at: {{trigger.fired_at}}"}]'::jsonb,
    1
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'meetings'),
    'Fathom Meeting Log',
    '{"type":"external_fathom_recording_ready","source":{"mode":"self"}}'::jsonb,
    '[{"type":"create_task","title_template":"Meeting: {{trigger.title}}","status":"logged","priority":"medium","assignees":[{"type":"agent","id":"vibey"}],"notes_template":"Who: {{trigger.primary_attendee_name}} ({{trigger.primary_attendee_email}})\nRecording / transcript: {{trigger.url}}\n\nSummary:\n{{trigger.summary}}\n\nAction items:\n{{trigger.action_items}}"},{"type":"send_to_agent","agent_key":"vibey","target_item_ref":"{{steps.1.item_id}}","output_type":"document_artifact","prompt_template":"Create a meeting log document for this Fathom call.\nCRITICAL RULE: Always draft replies and emails. Never send Slack messages, emails, or DMs. Leave drafts for human approval.\n\nInclude sections:\n- Who was on the call\n- Agenda / purpose\n- Key details and decisions\n- Acronyms / jargon explained (so future you is not lost)\n- Commitments (who owes what, by when)\n- Full transcript link: {{trigger.url}}\n\nTitle: {{trigger.title}}\nSummary:\n{{trigger.summary}}\n\nAction items:\n{{trigger.action_items}}"},{"type":"agent_suggest_tasks","agent_key":"vibey","max_suggestions":10,"instructions":"Suggest concrete follow-up tasks from this meeting. Mark owner clearly. Any outreach reply must be a draft only — never send."}]'::jsonb,
    0
  );

COMMIT;
