-- Seed global (user_id=NULL, org_id=NULL) agent_definitions for all system and library agents.
-- Content is pulled directly from agent_templates (the canonical source).
-- These rows are picked up by every machine's sync as a fallback, ensuring full prompt builds
-- regardless of whether the machine's user has personally hired the agent.
--
-- Mapping: template_key → agent_key(s)
-- Derived from agent_employee_templates.name_pool (first + common secondary names)
-- and SYSTEM_AGENT_FIXED_KEYS (brain_scholar → atlas, widget_builder → viktor).

WITH mapping(template_key, agent_key, source) AS (
  VALUES
    -- System agents (fixed keys)
    ('hr',                               'hr',       'system'),
    ('brain_scholar',                    'atlas',    'system'),
    -- Library agents - primary name (first in name_pool, lowercased)
    ('copywriter',                       'ivy',      'library'),
    ('copywriter',                       'wren',     'library'),
    ('designer',                         'lux',      'library'),
    ('designer',                         'pixel',    'library'),
    ('analyst',                          'niko',     'library'),
    ('automation_integrations_engineer', 'zane',     'library'),
    ('brand_manager',                    'vera',     'library'),
    ('brand_manager',                    'aria',     'library'),
    ('cfo',                              'orion',    'library'),
    ('cfo',                              'ledger',   'library'),
    ('coach',                            'eden',     'library'),
    ('customer_success',                 'nova',     'library'),
    ('media_producer',                   'rio',      'library'),
    ('pm_marketing',                     'mara',     'library'),
    ('pm_marketing',                     'tessa',    'library'),
    ('pm_operations',                    'jett',     'library'),
    ('product_manager',                  'sage',     'library'),
    ('developer',                        'rex',      'library'),
    ('ads_manager',                      'blaze',    'library'),
    -- widget_builder secondary names (viktor already has global rows; nico does not)
    ('widget_builder',                   'nico',     'library')
)
INSERT INTO public.agent_definitions (agent_key, file_name, content, user_id, org_id, source)
SELECT
  m.agent_key,
  t.file_name,
  t.content,
  NULL AS user_id,
  NULL AS org_id,
  m.source
FROM public.agent_templates t
JOIN mapping m ON m.template_key = t.template_key
-- Exclude AGENTS.md (excluded from prompt build in vibey mode) and TOOLS.md
-- to keep global rows minimal — only the identity files that drive prompt building.
-- Include TOOLS.md since it contributes tool notes to the prompt.
ON CONFLICT DO NOTHING;

-- Backfill source='system' on atlas and hr rows just inserted
UPDATE public.agent_definitions
SET source = 'system'
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('atlas', 'hr');
