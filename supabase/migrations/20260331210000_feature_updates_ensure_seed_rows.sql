-- Ensure core feature_updates rows exist (idempotent per title).
-- Covers: migration not yet applied on an env, or first seed skipped because table was non-empty.

INSERT INTO public.feature_updates (
  title,
  description,
  video_url,
  try_now_path,
  learn_more_url,
  category,
  is_active,
  sort_order
)
SELECT
  v.title,
  v.description,
  v.video_url,
  v.try_now_path,
  v.learn_more_url,
  v.category,
  v.is_active,
  v.sort_order
FROM (VALUES
  (
    'Meet Your AI Team',
    'Your agents are ready to work. See how to chat, delegate, and get things done.',
    NULL::text,
    '/studio'::text,
    'https://docs.vibey.im/team/meet-your-agents'::text,
    'tip'::text,
    true,
    10
  ),
  (
    'Agent Skills',
    'Teach your agents new skills to unlock specialized capabilities for your workflows.',
    NULL,
    '/team',
    'https://docs.vibey.im/team/agent-skills',
    'new',
    true,
    20
  ),
  (
    'Brain - Your Knowledge Hub',
    'Upload docs, links, and context. Your agents use it to give better answers.',
    NULL,
    '/brain',
    'https://docs.vibey.im/brain/how-the-brain-works',
    'new',
    true,
    30
  ),
  (
    'Organizations',
    'Create an organization, invite your team, and collaborate with shared agents and assets.',
    NULL,
    'action:open-create-org',
    'https://docs.vibey.im/organization/how-organizations-work',
    'new',
    true,
    40
  ),
  (
    'Campaigns',
    'Organize your marketing efforts into campaigns with goals and deliverables.',
    NULL,
    '/campaigns',
    'https://docs.vibey.im/campaigns/organizing-with-campaigns',
    'new',
    true,
    50
  ),
  (
    'Mission Control',
    'Track all active missions, see progress, and manage your AI workforce.',
    NULL,
    '/mission-control',
    'https://docs.vibey.im/missions/what-are-missions',
    'new',
    true,
    60
  )
) AS v(
  title,
  description,
  video_url,
  try_now_path,
  learn_more_url,
  category,
  is_active,
  sort_order
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_updates fu WHERE fu.title = v.title
);
