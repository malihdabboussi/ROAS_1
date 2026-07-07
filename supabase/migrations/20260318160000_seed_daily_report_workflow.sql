-- Seed daily-report workflow for vibey agent (user_id IS NULL).

INSERT INTO agent_workflows (user_id, agent_key, workflow_key, name, description, markdown_content, steps, is_enabled)
VALUES
(
  NULL,
  'vibey',
  'daily-report',
  'Daily Report',
  'Generate a complete PDF report analyzing the past 24 hours of funnel, email, ad, and social content performance.',
  E'You are running the Daily Report workflow. This produces a complete PDF report of the past 24 hours of campaign performance.\n\nFollow the steps below in order.\n\n## Steps\n\n### Step 1: Identify Campaign\n**Requires input:** Yes\n**Ask user:** "Which campaign should I report on? (Or I can use the campaign you have open.)"\n\nResolve campaign_id from the conversation context or user selection. If no campaign is selected, ask the user to pick one.\n\n### Step 2: Gather 24h Data\n**Requires input:** No\n\nCall `vibey_backend` with action `get_daily_report_data` and data `{"campaign_id":"<resolved>"}` (or omit campaign_id if using session campaign). This returns funnel metrics (visitors, leads, conversion), email metrics (sent, opened, clicked, rates), ad metrics (views, leads, breakdown), Meta insights (if connected), and social activity (created, published, scheduled in last 24h).\n\n### Step 3: Analyze & Synthesize\n**Requires input:** No\n\nInterpret the data. Highlight trends and notable changes. Summarize performance across funnel, email, ads, and social. Identify any gaps or opportunities. Write clear, actionable insights in the user''s voice.\n\n### Step 4: Generate PDF Report\n**Skill:** `pdf-builder` (read `skills/pdf-builder/SKILL.md`)\n**Requires input:** No\n\nFormat the analysis into a report structure. Use `create_pdf` with a clear title (e.g. "Daily Report — [Campaign Name] — [Date]") and markdown content. Include:\n- Executive summary\n- Funnel performance (visitors, leads, conversion rate)\n- Email performance (sent, opened, clicked, rates)\n- Ad performance (views, leads, Meta insights if available)\n- Social activity (posts created, published, scheduled)\n- Key insights and recommendations\n\nUse the brand theme if available for on-brand PDF styling.\n\n---\n\nAfter completing all 4 steps, present the PDF link to the user and offer to run a report for another campaign or time range.',
  '[
    {"order":1,"key":"identify-campaign","name":"Identify Campaign","skill_key":null,"requires_input":true,"input_prompt":"Which campaign should I report on? (Or I can use the campaign you have open.)","description":"Resolve campaign from context or user selection"},
    {"order":2,"key":"gather-data","name":"Gather 24h Data","skill_key":null,"requires_input":false,"description":"Call get_daily_report_data to aggregate funnel, email, ad, and social metrics for the past 24 hours"},
    {"order":3,"key":"analyze-synthesize","name":"Analyze & Synthesize","skill_key":null,"requires_input":false,"description":"Interpret metrics, highlight trends, summarize performance, and identify insights"},
    {"order":4,"key":"generate-pdf","name":"Generate PDF Report","skill_key":"pdf-builder","requires_input":false,"description":"Format analysis into branded PDF and call create_pdf"}
  ]'::jsonb,
  true
);
