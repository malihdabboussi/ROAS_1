-- Feature updates (What's New) — CMS-style rows + public video storage bucket

CREATE TABLE IF NOT EXISTS public.feature_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  video_url text,
  try_now_path text,
  learn_more_url text,
  category text NOT NULL DEFAULT 'new' CHECK (category IN ('new', 'improvement', 'tip')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_updates_active_sort_created
  ON public.feature_updates (is_active, sort_order DESC, created_at DESC);

ALTER TABLE public.feature_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feature_updates'
      AND policyname = 'feature_updates_select_authenticated_active'
  ) THEN
    CREATE POLICY feature_updates_select_authenticated_active
      ON public.feature_updates
      FOR SELECT
      TO authenticated
      USING (is_active = true);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('feature-updates', 'feature-updates', true, 104857600)
ON CONFLICT (id) DO UPDATE SET public = excluded.public, file_size_limit = excluded.file_size_limit;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'feature_updates_bucket_public_read'
  ) THEN
    CREATE POLICY feature_updates_bucket_public_read
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'feature-updates');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'feature_updates_bucket_service_role'
  ) THEN
    CREATE POLICY feature_updates_bucket_service_role
      ON storage.objects
      FOR ALL
      USING (bucket_id = 'feature-updates' AND auth.role() = 'service_role')
      WITH CHECK (bucket_id = 'feature-updates' AND auth.role() = 'service_role');
  END IF;
END $$;

INSERT INTO public.feature_updates (
  title, description, video_url, try_now_path, learn_more_url, category, is_active, sort_order
)
SELECT v.title, v.description, v.video_url, v.try_now_path, v.learn_more_url, v.category, true, v.sort_order
FROM (VALUES
  (
    'Meet Your AI Team',
    'Your agents are ready to work. See how to chat, delegate, and get things done.',
    NULL::text,
    '/studio'::text,
    'https://docs.vibey.im/team/meet-your-agents'::text,
    'tip'::text,
    10
  ),
  (
    'Agent Skills',
    'Teach your agents new skills to unlock specialized capabilities for your workflows.',
    NULL,
    '/team',
    'https://docs.vibey.im/team/agent-skills',
    'new',
    20
  ),
  (
    'Brain - Your Knowledge Hub',
    'Upload docs, links, and context. Your agents use it to give better answers.',
    NULL,
    '/brain',
    'https://docs.vibey.im/brain/how-the-brain-works',
    'new',
    30
  ),
  (
    'Organizations',
    'Create an organization, invite your team, and collaborate with shared agents and assets.',
    NULL,
    'action:open-create-org',
    'https://docs.vibey.im/organization/how-organizations-work',
    'new',
    40
  ),
  (
    'Campaigns',
    'Organize your marketing efforts into campaigns with goals and deliverables.',
    NULL,
    '/campaigns',
    'https://docs.vibey.im/campaigns/organizing-with-campaigns',
    'new',
    50
  ),
  (
    'Mission Control',
    'Track all active missions, see progress, and manage your AI workforce.',
    NULL,
    '/mission-control',
    'https://docs.vibey.im/missions/what-are-missions',
    'new',
    60
  )
) AS v(title, description, video_url, try_now_path, learn_more_url, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.feature_updates LIMIT 1);
