-- Refresh improved Space Template doc bodies.
BEGIN;

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Personal Workspace</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Today (List)</strong> — quick capture and daily focus</li><li><strong>This Week (Kanban)</strong> — drag tasks across the week</li><li><strong>Notes (Docs)</strong> — long-form thinking and references</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'personal-workspace'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to use your personal workspace';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Personal Workspace</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Today (List)</strong> — quick capture and daily focus</li><li><strong>This Week (Kanban)</strong> — drag tasks across the week</li><li><strong>Notes (Docs)</strong> — long-form thinking and references</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to use your personal workspace'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Client / Account Workspace</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Missions</strong> — multi-step client work with agent help</li><li><strong>Deliverables (Kanban)</strong> — track brief → paid</li><li><strong>Calendar</strong> — syncs and deadlines</li><li><strong>Docs</strong> — briefs, brand notes, meeting logs</li><li><strong>Channel</strong> — internal client comms</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'client-account-workspace'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run a client space';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Client / Account Workspace</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Missions</strong> — multi-step client work with agent help</li><li><strong>Deliverables (Kanban)</strong> — track brief → paid</li><li><strong>Calendar</strong> — syncs and deadlines</li><li><strong>Docs</strong> — briefs, brand notes, meeting logs</li><li><strong>Channel</strong> — internal client comms</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run a client space'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>Client snapshot</h2>
<ul><li>Who are we helping?</li><li>What do they sell, ship, or need from us?</li><li>What does a win look like from their side?</li></ul>
<h2>Goals</h2>
<ul><li>Primary outcome</li><li>Secondary outcome</li><li>What is out of scope</li></ul>
<h2>KPIs</h2>
<ul><li>Revenue, leads, retention, delivery quality, or another measurable result</li><li>Target number</li><li>Review cadence</li></ul>
<h2>Constraints</h2>
<ul><li>Budget</li><li>Timeline</li><li>Brand, legal, platform, or approval limits</li></ul>
<h2>Stakeholders</h2>
<ul><li>Decision maker</li><li>Day-to-day contact</li><li>Internal owner</li></ul>
<h2>Timeline</h2>
<ul><li>Kickoff</li><li>First review</li><li>Delivery</li><li>Retrospective</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'client-account-workspace'
  AND item.kind = 'doc'
  AND item.title = 'Brief — replace with your client brief';

UPDATE public.space_items si
SET doc_body = '<h2>Client snapshot</h2>
<ul><li>Who are we helping?</li><li>What do they sell, ship, or need from us?</li><li>What does a win look like from their side?</li></ul>
<h2>Goals</h2>
<ul><li>Primary outcome</li><li>Secondary outcome</li><li>What is out of scope</li></ul>
<h2>KPIs</h2>
<ul><li>Revenue, leads, retention, delivery quality, or another measurable result</li><li>Target number</li><li>Review cadence</li></ul>
<h2>Constraints</h2>
<ul><li>Budget</li><li>Timeline</li><li>Brand, legal, platform, or approval limits</li></ul>
<h2>Stakeholders</h2>
<ul><li>Decision maker</li><li>Day-to-day contact</li><li>Internal owner</li></ul>
<h2>Timeline</h2>
<ul><li>Kickoff</li><li>First review</li><li>Delivery</li><li>Retrospective</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Brief — replace with your client brief'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Product Launch</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Countdown (Calendar)</strong> — T-minus milestones</li><li><strong>Launch board (Kanban)</strong> — pre / launch / post phases</li><li><strong>Docs</strong> — brief, GTM checklist, press kit</li><li><strong>Channel</strong> — day-of coordination</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'product-launch'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run a launch';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Product Launch</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Countdown (Calendar)</strong> — T-minus milestones</li><li><strong>Launch board (Kanban)</strong> — pre / launch / post phases</li><li><strong>Docs</strong> — brief, GTM checklist, press kit</li><li><strong>Channel</strong> — day-of coordination</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run a launch'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>What are we launching?</h2>
<ul><li>Product, feature, offer, or announcement</li><li>One-line promise</li><li>What changes for the customer</li></ul>
<h2>Why now?</h2>
<ul><li>Business reason</li><li>Customer reason</li><li>Timing pressure</li></ul>
<h2>Audience</h2>
<ul><li>Primary segment</li><li>Pain or desire</li><li>Message angle</li></ul>
<h2>Channels</h2>
<ul><li>Email</li><li>Social</li><li>Website</li><li>Sales or customer success</li></ul>
<h2>Launch checklist</h2>
<ul><li>Announcement copy approved</li><li>Landing page or docs ready</li><li>Support notes ready</li><li>Monitoring owner assigned</li></ul>
<h2>Risks</h2>
<ul><li>What could break?</li><li>Who decides if we pause?</li><li>What is the rollback plan?</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'product-launch'
  AND item.kind = 'doc'
  AND item.title = 'Launch brief template';

UPDATE public.space_items si
SET doc_body = '<h2>What are we launching?</h2>
<ul><li>Product, feature, offer, or announcement</li><li>One-line promise</li><li>What changes for the customer</li></ul>
<h2>Why now?</h2>
<ul><li>Business reason</li><li>Customer reason</li><li>Timing pressure</li></ul>
<h2>Audience</h2>
<ul><li>Primary segment</li><li>Pain or desire</li><li>Message angle</li></ul>
<h2>Channels</h2>
<ul><li>Email</li><li>Social</li><li>Website</li><li>Sales or customer success</li></ul>
<h2>Launch checklist</h2>
<ul><li>Announcement copy approved</li><li>Landing page or docs ready</li><li>Support notes ready</li><li>Monitoring owner assigned</li></ul>
<h2>Risks</h2>
<ul><li>What could break?</li><li>Who decides if we pause?</li><li>What is the rollback plan?</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Launch brief template'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Sales Pipeline</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Deal Stages (Kanban)</strong> — drag deals through your motion</li><li><strong>All Deals (List)</strong> — forecast and bulk edits</li><li><strong>Contacts</strong> — people tied to deals</li><li><strong>Docs</strong> — playbooks and proposals</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'sales-pipeline'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run pipeline in Vibey';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Sales Pipeline</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Deal Stages (Kanban)</strong> — drag deals through your motion</li><li><strong>All Deals (List)</strong> — forecast and bulk edits</li><li><strong>Contacts</strong> — people tied to deals</li><li><strong>Docs</strong> — playbooks and proposals</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run pipeline in Vibey'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Company Wiki</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Wiki (Docs)</strong> — policies, how-tos, decisions</li><li><strong>Topic Index (List)</strong> — lightweight index rows</li><li><strong>Channel</strong> — ask the team questions</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'company-wiki'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to keep your wiki alive';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Company Wiki</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Wiki (Docs)</strong> — policies, how-tos, decisions</li><li><strong>Topic Index (List)</strong> — lightweight index rows</li><li><strong>Channel</strong> — ask the team questions</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to keep your wiki alive'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>Purpose</h2>
<p>Use this page to make team norms explicit. If people ask the same question twice, the answer probably belongs here.</p>
<h2>Decision rights</h2>
<ul><li>Who can decide alone?</li><li>What needs review?</li><li>What needs leadership approval?</li></ul>
<h2>Communication norms</h2>
<ul><li>Where do urgent updates go?</li><li>Where do project decisions live?</li><li>What should be written down after meetings?</li></ul>
<h2>Escalation paths</h2>
<ul><li>When something is blocked</li><li>When a customer is at risk</li><li>When scope changes</li></ul>
<h2>Weekly rhythm</h2>
<ul><li>What gets reviewed weekly?</li><li>Who owns cleanup?</li><li>What should be archived?</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'company-wiki'
  AND item.kind = 'doc'
  AND item.title = 'How we work — replace with your operating principles';

UPDATE public.space_items si
SET doc_body = '<h2>Purpose</h2>
<p>Use this page to make team norms explicit. If people ask the same question twice, the answer probably belongs here.</p>
<h2>Decision rights</h2>
<ul><li>Who can decide alone?</li><li>What needs review?</li><li>What needs leadership approval?</li></ul>
<h2>Communication norms</h2>
<ul><li>Where do urgent updates go?</li><li>Where do project decisions live?</li><li>What should be written down after meetings?</li></ul>
<h2>Escalation paths</h2>
<ul><li>When something is blocked</li><li>When a customer is at risk</li><li>When scope changes</li></ul>
<h2>Weekly rhythm</h2>
<ul><li>What gets reviewed weekly?</li><li>Who owns cleanup?</li><li>What should be archived?</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'How we work — replace with your operating principles'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>Tool stack</h2>
<p>List the tools your team depends on and what each one is for. This keeps new teammates from guessing.</p>
<h2>Communication</h2>
<ul><li>Chat</li><li>Calls</li><li>Meeting notes</li></ul>
<h2>Customer and revenue</h2>
<ul><li>CRM</li><li>Support</li><li>Billing</li></ul>
<h2>Product and delivery</h2>
<ul><li>Design</li><li>Engineering</li><li>Project tracking</li></ul>
<h2>Data and reporting</h2>
<ul><li>Analytics</li><li>Dashboards</li><li>Source of truth</li></ul>
<h2>Access notes</h2>
<ul><li>Who owns access?</li><li>Where do requests go?</li><li>Which tools require approval?</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'company-wiki'
  AND item.kind = 'doc'
  AND item.title = 'Tools we use — list your stack here';

UPDATE public.space_items si
SET doc_body = '<h2>Tool stack</h2>
<p>List the tools your team depends on and what each one is for. This keeps new teammates from guessing.</p>
<h2>Communication</h2>
<ul><li>Chat</li><li>Calls</li><li>Meeting notes</li></ul>
<h2>Customer and revenue</h2>
<ul><li>CRM</li><li>Support</li><li>Billing</li></ul>
<h2>Product and delivery</h2>
<ul><li>Design</li><li>Engineering</li><li>Project tracking</li></ul>
<h2>Data and reporting</h2>
<ul><li>Analytics</li><li>Dashboards</li><li>Source of truth</li></ul>
<h2>Access notes</h2>
<ul><li>Who owns access?</li><li>Where do requests go?</li><li>Which tools require approval?</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Tools we use — list your stack here'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Operations Hub</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>List</strong> — backlog and priorities</li><li><strong>Kanban</strong> — this week execution</li><li><strong>Docs</strong> — SOPs and vendor lists</li><li><strong>Channel</strong> — daily standups</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'operations-hub'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run your ops hub';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Operations Hub</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>List</strong> — backlog and priorities</li><li><strong>Kanban</strong> — this week execution</li><li><strong>Docs</strong> — SOPs and vendor lists</li><li><strong>Channel</strong> — daily standups</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run your ops hub'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Content Calendar</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Calendar</strong> — schedule posts</li><li><strong>Pipeline (Kanban)</strong> — ideas → live → repurpose</li><li><strong>Social Posts</strong> — artifact drafts</li><li><strong>IG Research</strong> — competitor and niche pulls</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'content-calendar'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run a content calendar';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Content Calendar</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Calendar</strong> — schedule posts</li><li><strong>Pipeline (Kanban)</strong> — ideas → live → repurpose</li><li><strong>Social Posts</strong> — artifact drafts</li><li><strong>IG Research</strong> — competitor and niche pulls</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run a content calendar'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>Your content promise</h2>
<p>Write the reason someone should keep paying attention to you. Keep it simple enough that a teammate can use it before posting.</p>
<h2>Pillar 1</h2>
<ul><li>Topic</li><li>Audience need</li><li>Example post ideas</li></ul>
<h2>Pillar 2</h2>
<ul><li>Topic</li><li>Audience need</li><li>Example post ideas</li></ul>
<h2>Pillar 3</h2>
<ul><li>Topic</li><li>Audience need</li><li>Example post ideas</li></ul>
<h2>Repurpose rules</h2>
<ul><li>What becomes a short post?</li><li>What becomes a long post?</li><li>What becomes a carousel, email, or video?</li></ul>
<h2>Quality bar</h2>
<ul><li>What do we always include?</li><li>What do we never publish?</li><li>Who approves before it goes live?</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'content-calendar'
  AND item.kind = 'doc'
  AND item.title = 'Content pillars — define yours here';

UPDATE public.space_items si
SET doc_body = '<h2>Your content promise</h2>
<p>Write the reason someone should keep paying attention to you. Keep it simple enough that a teammate can use it before posting.</p>
<h2>Pillar 1</h2>
<ul><li>Topic</li><li>Audience need</li><li>Example post ideas</li></ul>
<h2>Pillar 2</h2>
<ul><li>Topic</li><li>Audience need</li><li>Example post ideas</li></ul>
<h2>Pillar 3</h2>
<ul><li>Topic</li><li>Audience need</li><li>Example post ideas</li></ul>
<h2>Repurpose rules</h2>
<ul><li>What becomes a short post?</li><li>What becomes a long post?</li><li>What becomes a carousel, email, or video?</li></ul>
<h2>Quality bar</h2>
<ul><li>What do we always include?</li><li>What do we never publish?</li><li>Who approves before it goes live?</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Content pillars — define yours here'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Marketing Campaign</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Campaign board</strong> — phases from planning → wrapped</li><li><strong>Funnels / Ads / Emails</strong> — artifacts in one space</li><li><strong>Reporting</strong> — connect ad accounts for live metrics</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'marketing-campaign'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run a marketing campaign';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Marketing Campaign</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Campaign board</strong> — phases from planning → wrapped</li><li><strong>Funnels / Ads / Emails</strong> — artifacts in one space</li><li><strong>Reporting</strong> — connect ad accounts for live metrics</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run a marketing campaign'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>Campaign goal</h2>
<ul><li>What are we trying to move?</li><li>Why does this campaign matter now?</li><li>What should be true when it is done?</li></ul>
<h2>Audience</h2>
<ul><li>Segment</li><li>Pain or desire</li><li>Buying trigger</li></ul>
<h2>Offer</h2>
<ul><li>Core promise</li><li>Proof</li><li>CTA</li></ul>
<h2>Hook</h2>
<ul><li>Main angle</li><li>Backup angles</li><li>Words or claims to avoid</li></ul>
<h2>Channels</h2>
<ul><li>Funnel</li><li>Ads</li><li>Email</li><li>Organic social</li></ul>
<h2>KPIs</h2>
<ul><li>Lead metric</li><li>Conversion metric</li><li>Revenue or pipeline metric</li><li>Review date</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'marketing-campaign'
  AND item.kind = 'doc'
  AND item.title = 'Campaign brief template';

UPDATE public.space_items si
SET doc_body = '<h2>Campaign goal</h2>
<ul><li>What are we trying to move?</li><li>Why does this campaign matter now?</li><li>What should be true when it is done?</li></ul>
<h2>Audience</h2>
<ul><li>Segment</li><li>Pain or desire</li><li>Buying trigger</li></ul>
<h2>Offer</h2>
<ul><li>Core promise</li><li>Proof</li><li>CTA</li></ul>
<h2>Hook</h2>
<ul><li>Main angle</li><li>Backup angles</li><li>Words or claims to avoid</li></ul>
<h2>Channels</h2>
<ul><li>Funnel</li><li>Ads</li><li>Email</li><li>Organic social</li></ul>
<h2>KPIs</h2>
<ul><li>Lead metric</li><li>Conversion metric</li><li>Revenue or pipeline metric</li><li>Review date</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Campaign brief template'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Customer Onboarding</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Onboarding stages</strong> — Welcome → Advocate</li><li><strong>Missions</strong> — multi-step plays per stage</li><li><strong>Contacts</strong> — customer records</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'customer-onboarding'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run customer onboarding';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Customer Onboarding</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Onboarding stages</strong> — Welcome → Advocate</li><li><strong>Missions</strong> — multi-step plays per stage</li><li><strong>Contacts</strong> — customer records</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run customer onboarding'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>Onboarding promise</h2>
<p>Write the outcome every new customer should reach by the end of onboarding.</p>
<h2>Stage 1: Welcome</h2>
<ul><li>Send welcome note</li><li>Confirm owner and timeline</li><li>Share first steps</li></ul>
<h2>Stage 2: Setup</h2>
<ul><li>Collect required access</li><li>Configure workspace</li><li>Confirm success criteria</li></ul>
<h2>Stage 3: Launch</h2>
<ul><li>Run first workflow</li><li>Review early results</li><li>Resolve blockers</li></ul>
<h2>Stage 4: Adoption</h2>
<ul><li>Teach repeatable habits</li><li>Identify expansion opportunities</li><li>Document open questions</li></ul>
<h2>Stage 5: Advocate</h2>
<ul><li>Capture proof</li><li>Ask for testimonial or referral</li><li>Move customer into ongoing success rhythm</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'customer-onboarding'
  AND item.kind = 'doc'
  AND item.title = 'Onboarding playbook — fill in your steps';

UPDATE public.space_items si
SET doc_body = '<h2>Onboarding promise</h2>
<p>Write the outcome every new customer should reach by the end of onboarding.</p>
<h2>Stage 1: Welcome</h2>
<ul><li>Send welcome note</li><li>Confirm owner and timeline</li><li>Share first steps</li></ul>
<h2>Stage 2: Setup</h2>
<ul><li>Collect required access</li><li>Configure workspace</li><li>Confirm success criteria</li></ul>
<h2>Stage 3: Launch</h2>
<ul><li>Run first workflow</li><li>Review early results</li><li>Resolve blockers</li></ul>
<h2>Stage 4: Adoption</h2>
<ul><li>Teach repeatable habits</li><li>Identify expansion opportunities</li><li>Document open questions</li></ul>
<h2>Stage 5: Advocate</h2>
<ul><li>Capture proof</li><li>Ask for testimonial or referral</li><li>Move customer into ongoing success rhythm</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Onboarding playbook — fill in your steps'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Hiring Pipeline</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Hiring board</strong> — Applied → Hired / Rejected</li><li><strong>Candidates (Contacts)</strong> — people records</li><li><strong>Forms</strong> — publish an application form</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'hiring-pipeline'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run hiring';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Hiring Pipeline</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Hiring board</strong> — Applied → Hired / Rejected</li><li><strong>Candidates (Contacts)</strong> — people records</li><li><strong>Forms</strong> — publish an application form</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run hiring'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>Role mission</h2>
<p>Write one paragraph that explains why this role exists and what changes when the right person joins.</p>
<h2>Outcomes</h2>
<ul><li>30-day outcome</li><li>60-day outcome</li><li>90-day outcome</li></ul>
<h2>Responsibilities</h2>
<ul><li>What they own</li><li>What they support</li><li>What they do not own</li></ul>
<h2>Requirements</h2>
<ul><li>Must-have experience</li><li>Useful experience</li><li>Traits that matter here</li></ul>
<h2>Interview process</h2>
<ul><li>Screen</li><li>Practical exercise or work sample</li><li>Team conversation</li><li>Final decision</li></ul>
<h2>Scorecard</h2>
<ul><li>Skill</li><li>Judgment</li><li>Communication</li><li>Culture fit</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'hiring-pipeline'
  AND item.kind = 'doc'
  AND item.title = 'Job description template';

UPDATE public.space_items si
SET doc_body = '<h2>Role mission</h2>
<p>Write one paragraph that explains why this role exists and what changes when the right person joins.</p>
<h2>Outcomes</h2>
<ul><li>30-day outcome</li><li>60-day outcome</li><li>90-day outcome</li></ul>
<h2>Responsibilities</h2>
<ul><li>What they own</li><li>What they support</li><li>What they do not own</li></ul>
<h2>Requirements</h2>
<ul><li>Must-have experience</li><li>Useful experience</li><li>Traits that matter here</li></ul>
<h2>Interview process</h2>
<ul><li>Screen</li><li>Practical exercise or work sample</li><li>Team conversation</li><li>Final decision</li></ul>
<h2>Scorecard</h2>
<ul><li>Skill</li><li>Judgment</li><li>Communication</li><li>Culture fit</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Job description template'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Research & Insights</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>IG / TikTok Research</strong> — pull outliers and hooks</li><li><strong>Sources (Table)</strong> — log references</li><li><strong>Findings (Docs)</strong> — synthesize insights</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'research-insights'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run audience research';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Research & Insights</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>IG / TikTok Research</strong> — pull outliers and hooks</li><li><strong>Sources (Table)</strong> — log references</li><li><strong>Findings (Docs)</strong> — synthesize insights</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run audience research'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>Research question</h2>
<p>What are we trying to learn, prove, or decide?</p>
<h2>Method</h2>
<ul><li>Sources reviewed</li><li>Accounts or competitors checked</li><li>Date range</li><li>Selection criteria</li></ul>
<h2>Findings</h2>
<ul><li>Pattern 1</li><li>Pattern 2</li><li>Pattern 3</li></ul>
<h2>Evidence</h2>
<ul><li>Link or source</li><li>Why it matters</li><li>Screenshot or note</li></ul>
<h2>Implications</h2>
<ul><li>What should we test?</li><li>What should we stop doing?</li><li>What should become a task?</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'research-insights'
  AND item.kind = 'doc'
  AND item.title = 'Findings template';

UPDATE public.space_items si
SET doc_body = '<h2>Research question</h2>
<p>What are we trying to learn, prove, or decide?</p>
<h2>Method</h2>
<ul><li>Sources reviewed</li><li>Accounts or competitors checked</li><li>Date range</li><li>Selection criteria</li></ul>
<h2>Findings</h2>
<ul><li>Pattern 1</li><li>Pattern 2</li><li>Pattern 3</li></ul>
<h2>Evidence</h2>
<ul><li>Link or source</li><li>Why it matters</li><li>Screenshot or note</li></ul>
<h2>Implications</h2>
<ul><li>What should we test?</li><li>What should we stop doing?</li><li>What should become a task?</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Findings template'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h1>Welcome to your Engineering / Bug Tracker</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Triage board</strong> — Triage → Shipped</li><li><strong>All issues (Table)</strong> — severity and area fields</li><li><strong>Specs & RFCs</strong> — design docs</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'engineering-bug-tracker'
  AND item.kind = 'doc'
  AND item.title = 'Welcome — how to run engineering tracking';

UPDATE public.space_items si
SET doc_body = '<h1>Welcome to your Engineering / Bug Tracker</h1>
<p>This space is already wired with the views, docs, and starter tasks you need. Don''t treat it like a blank board. Treat it like a working system you can make yours.</p>
<h2>How to use this space</h2>
<ul><li><strong>Triage board</strong> — Triage → Shipped</li><li><strong>All issues (Table)</strong> — severity and area fields</li><li><strong>Specs & RFCs</strong> — design docs</li></ul>
<h2>Start here</h2>
<ul><li>Open each view once so you know what lives where.</li><li>Replace the sample tasks with real work, but keep the same flow.</li><li>Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.</li><li>Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.</li></ul>
<h2>Keep it alive</h2>
<p>Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.</p>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'Welcome — how to run engineering tracking'
  AND si.custom_data ? 'body';

UPDATE public.space_template_items item
SET body = '<h2>Problem</h2>
<ul><li>What is broken, missing, slow, or confusing?</li><li>Who feels it?</li><li>What happens if we do nothing?</li></ul>
<h2>Proposal</h2>
<ul><li>Recommended approach</li><li>Main implementation steps</li><li>Owner</li></ul>
<h2>Tradeoffs</h2>
<ul><li>What gets simpler?</li><li>What gets more complex?</li><li>What are we intentionally not solving?</li></ul>
<h2>Rollout</h2>
<ul><li>Test plan</li><li>Release plan</li><li>Rollback plan</li></ul>
<h2>Open questions</h2>
<ul><li>Question 1</li><li>Question 2</li><li>Decision needed by</li></ul>'
FROM public.space_templates tpl
WHERE item.template_id = tpl.id
  AND tpl.slug = 'engineering-bug-tracker'
  AND item.kind = 'doc'
  AND item.title = 'RFC template';

UPDATE public.space_items si
SET doc_body = '<h2>Problem</h2>
<ul><li>What is broken, missing, slow, or confusing?</li><li>Who feels it?</li><li>What happens if we do nothing?</li></ul>
<h2>Proposal</h2>
<ul><li>Recommended approach</li><li>Main implementation steps</li><li>Owner</li></ul>
<h2>Tradeoffs</h2>
<ul><li>What gets simpler?</li><li>What gets more complex?</li><li>What are we intentionally not solving?</li></ul>
<h2>Rollout</h2>
<ul><li>Test plan</li><li>Release plan</li><li>Rollback plan</li></ul>
<h2>Open questions</h2>
<ul><li>Question 1</li><li>Question 2</li><li>Decision needed by</li></ul>'
WHERE si.source = 'template'
  AND si.status = 'doc'
  AND si.title = 'RFC template'
  AND si.custom_data ? 'body';

COMMIT;
