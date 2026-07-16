-- Seed Page Grader into integrations_available (required by user_integrations FK).
INSERT INTO public.integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES (
  'page_grader',
  'page_grader',
  'Page Grader',
  'Send Space tasks to Page Grader as workload for client funnel, copy, and design teams.',
  'api_key',
  true,
  jsonb_build_object(
    'category', 'productivity',
    'website', 'https://portal.roas.io'
  )
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata,
  updated_at = now();
