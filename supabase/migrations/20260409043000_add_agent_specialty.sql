-- Add specialty column to agents_registry
ALTER TABLE agents_registry ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT NULL;

-- Add specialty column to agent_employee_templates
ALTER TABLE agent_employee_templates ADD COLUMN IF NOT EXISTS specialty TEXT NOT NULL DEFAULT '';

-- Populate specialty for all templates
UPDATE agent_employee_templates SET specialty = 'Strategic leadership, campaign orchestration, cross-team coordination, growth strategy' WHERE role_key = 'vibey' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Headlines, ad copy, email sequences, blog posts, brand voice, persuasive writing' WHERE role_key = 'copywriter' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Visual design, banners, brand identity, layout, image generation, presentation design' WHERE role_key = 'designer' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Ad performance, ROI analysis, audience targeting, data-driven growth recommendations' WHERE role_key = 'analyst' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Web development, Next.js, landing pages, integrations, production-ready code' WHERE role_key = 'developer' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Workspace widgets, data-aware dashboards, theme-safe components' WHERE role_key = 'widget_builder' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Campaign timelines, creative review cadence, launch coordination across teams' WHERE role_key = 'pm_marketing' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Sprint planning, release coordination, quality gates, delivery tracking' WHERE role_key = 'pm_product' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Operational systems, team cadence, cross-department coordination, process design' WHERE role_key = 'pm_operations' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'API integrations, webhook automations, reliability engineering' WHERE role_key = 'automation_integrations_engineer' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Product planning, scope decisions, user-outcome alignment, roadmap prioritization' WHERE role_key = 'product_manager' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Test strategy, bug reproduction, regression prevention, release quality' WHERE role_key = 'qa_engineer' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Video production, multi-platform content, editing, distribution optimization' WHERE role_key = 'media_producer' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Brand narrative, social positioning, creator strategy, market signals' WHERE role_key = 'brand_manager' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Budgeting, cash-flow analysis, financial planning, spending optimization' WHERE role_key = 'cfo' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Team performance, coaching systems, cadence building, execution quality' WHERE role_key = 'coach' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Knowledge curation, research synthesis, memory organization, brain management' WHERE role_key = 'brain_scholar' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Meta ads lifecycle, audience targeting, creative testing, budget optimization' WHERE role_key = 'ads_manager' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Client troubleshooting, FAQ responses, ticket resolution' WHERE role_key = 'customer_support' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Client onboarding, proactive guidance, program navigation, retention' WHERE role_key = 'customer_success' AND specialty = '';
UPDATE agent_employee_templates SET specialty = 'Deep mentoring, personalized coaching, accountability, goal achievement' WHERE role_key = 'customer_coach' AND specialty = '';

-- Backfill existing agents: first by agent_key matching role_key
UPDATE agents_registry ar
SET specialty = aet.specialty
FROM agent_employee_templates aet
WHERE ar.specialty IS NULL
  AND ar.agent_key = aet.role_key;

-- Backfill existing agents: then by role matching (covers name-derived agent_keys)
UPDATE agents_registry ar
SET specialty = aet.specialty
FROM agent_employee_templates aet
WHERE ar.specialty IS NULL
  AND ar.role = aet.role;

-- Backfill HR system agents
UPDATE agents_registry
SET specialty = 'Team hiring, agent design, onboarding, skill management'
WHERE specialty IS NULL AND agent_key = 'hr';
