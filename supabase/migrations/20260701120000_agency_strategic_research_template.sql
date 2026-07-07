-- Agency Strategic Research preset — research → strategy brief → sample content → Brain task.
BEGIN;

INSERT INTO public.space_automation_templates (
  template_key,
  title,
  description,
  badge,
  featured,
  is_new,
  workflows,
  integration,
  trigger_group,
  body,
  sort_order
)
VALUES (
  'agency-strategic-research',
  'Strategic Research',
  'When a task moves to Research, runs brand + competitive research, human review, sample content, and a Brain crystallization follow-up task.',
  'Agency preset',
  true,
  true,
  ARRAY['agency_ops']::text[],
  NULL,
  'tasks',
  '{"is_draft":true,"name":"Strategic Research","enabled":false,"trigger":{"type":"status_change","to":"research"},"actions":[{"type":"send_to_agent","agent_key":"vibey","priority":"high","prompt_template":"Run Strategic Research for this task: {{task.title}}\n\nUse the task description/notes as the client scope: {{task.description}}\n\nSTEP 1: Research the brand and what they sell, including messaging pillars, offer positioning, proof points, tone, and brand guidelines.\nSTEP 2: Determine who they sell to. Define practical customer avatars, pain points, desired outcomes, objections, and buying triggers.\nSTEP 3: Competitive research. Identify similar brands, what they do well, what they miss, market patterns, and the unique opportunity for this client.\nSTEP 4: Ad library market research. Review Meta, Google, TikTok, and other visible ad examples where available. Incorporate hooks, angles, offers, creative patterns, and gaps into the competitive research.\nSTEP 5: Compile the research into a clear strategy document outline with how this works, what this looks like, and talking points for funnels, ads, content, landing pages, blog, and email ideas.\n\nReturn a concise strategy brief and recommended next steps for human review.","output_type":"document_artifact","continuation":"after_task_completes","completed_status":"in_review","agent_collaboration":"allowed","extended_brain_knowledge":true},{"type":"add_comment","message_template":"Strategic Research is ready for human review.\n\nReview checklist:\n- Approve the overarching strategy, or request revisions.\n- If approved, use the sample-content step/task to demonstrate the strategy to the client.\n- If revisions are needed, add feedback here and move the task back to RESEARCH. The revision pass should combine feedback and return to Step 4: ad library and competitive research.\n- After final approval, crystallize the approved strategy to Brain manually as the overarching strategy."},{"type":"send_to_agent","agent_key":"vibey","priority":"high","prompt_template":"Create sample snippets of content to demonstrate the approved strategy for this task: {{task.title}}\n\nUse the latest strategy context and review notes from the task. Create:\n1. Sample social posts\n2. Sample landing page section or page copy\n3. Sample blog or email content\n\nMake these client-facing examples that demonstrate the strategic direction clearly.","output_type":"document_artifact","continuation":"after_task_completes","completed_status":"in_review","agent_collaboration":"allowed","extended_brain_knowledge":true},{"type":"add_comment","message_template":"Sample strategy content is ready for client review.\n\nClient review path:\n- If approved, crystallize the approved strategy to Brain manually as the overarching strategy.\n- If revisions are needed, add client feedback here and move the task back to RESEARCH. The revision pass should combine feedback and return to Step 4: ad library and competitive research."},{"type":"create_task","title_template":"Crystallize approved strategy to Brain: {{task.title}}","status":"todo","priority":"high"}]}'::jsonb,
  430
)
ON CONFLICT (template_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge,
  featured = EXCLUDED.featured,
  is_new = EXCLUDED.is_new,
  workflows = EXCLUDED.workflows,
  integration = EXCLUDED.integration,
  trigger_group = EXCLUDED.trigger_group,
  body = EXCLUDED.body,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

COMMIT;
