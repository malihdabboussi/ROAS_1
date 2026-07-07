-- Normalize agent_employee_templates.responsibilities to max 4 words per bullet.
-- Rule: verb-first, title case, no filler. Exactly 3 bullets per agent.
-- customer_coach is already compliant — no update needed.

UPDATE public.agent_employee_templates SET responsibilities = '["Run Meta ad campaigns","Target audiences and budgets","Optimize ROAS and spend"]'::jsonb WHERE role_key = 'ads_manager';
UPDATE public.agent_employee_templates SET responsibilities = '["Analyze content performance","Map competitor landscape","Deliver actionable reports"]'::jsonb WHERE role_key = 'analyst';
UPDATE public.agent_employee_templates SET responsibilities = '["Architect automation pipelines","Implement API integrations","Monitor service reliability"]'::jsonb WHERE role_key = 'automation_integrations_engineer';
UPDATE public.agent_employee_templates SET responsibilities = '["Extract knowledge from content","Curate and tag entries","Maintain knowledge quality"]'::jsonb WHERE role_key = 'brain_scholar';
UPDATE public.agent_employee_templates SET responsibilities = '["Govern brand messaging","Direct creator strategy","Plan social campaigns"]'::jsonb WHERE role_key = 'brand_manager';
UPDATE public.agent_employee_templates SET responsibilities = '["Plan cash flow runway","Govern P&L economics","Prioritize ROI budgets"]'::jsonb WHERE role_key = 'cfo';
UPDATE public.agent_employee_templates SET responsibilities = '["Run performance reviews","Coordinate team cadence","Coach and develop people"]'::jsonb WHERE role_key = 'coach';
UPDATE public.agent_employee_templates SET responsibilities = '["Write email campaigns","Build landing page copy","Craft headlines and CTAs"]'::jsonb WHERE role_key = 'copywriter';
UPDATE public.agent_employee_templates SET responsibilities = '["Guide client onboarding","Navigate program resources","Suggest next steps"]'::jsonb WHERE role_key = 'customer_success';
UPDATE public.agent_employee_templates SET responsibilities = '["Answer client questions","Troubleshoot issues step-by-step","Provide actionable solutions"]'::jsonb WHERE role_key = 'customer_support';
UPDATE public.agent_employee_templates SET responsibilities = '["Direct creative systems","Design ads and creatives","Structure landing pages"]'::jsonb WHERE role_key = 'designer';
UPDATE public.agent_employee_templates SET responsibilities = '["Build full-stack websites","Wire APIs and integrations","Troubleshoot and optimize"]'::jsonb WHERE role_key = 'developer';
UPDATE public.agent_employee_templates SET responsibilities = '["Produce audio and video","Optimize per platform","Maintain distribution cadence"]'::jsonb WHERE role_key = 'media_producer';
UPDATE public.agent_employee_templates SET responsibilities = '["Manage campaign timelines","Run creative review flows","Coordinate cross-channel launches"]'::jsonb WHERE role_key = 'pm_marketing';
UPDATE public.agent_employee_templates SET responsibilities = '["Design SOPs and processes","Coordinate department cadence","Accelerate delivery speed"]'::jsonb WHERE role_key = 'pm_operations';
UPDATE public.agent_employee_templates SET responsibilities = '["Plan sprints and backlog","Coordinate release readiness","Track technical debt"]'::jsonb WHERE role_key = 'pm_product';
UPDATE public.agent_employee_templates SET responsibilities = '["Prioritize product roadmap","Write specs and criteria","Align cross-functional teams"]'::jsonb WHERE role_key = 'product_manager';
UPDATE public.agent_employee_templates SET responsibilities = '["Plan and execute QA","Report bugs with repro","Run regression checks"]'::jsonb WHERE role_key = 'qa_engineer';
UPDATE public.agent_employee_templates SET responsibilities = '["Run end-to-end campaigns","Dispatch to specialist agents","Guard brand quality"]'::jsonb WHERE role_key = 'vibey';
UPDATE public.agent_employee_templates SET responsibilities = '["Build dashboard widget TSX","Map data to adapters","Iterate widget interactions"]'::jsonb WHERE role_key = 'widget_builder';
