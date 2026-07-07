-- Social post scheduling support

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_posts_status_check'
  ) THEN
    ALTER TABLE public.social_posts
      ADD CONSTRAINT social_posts_status_check
      CHECK (status IN ('draft', 'ready', 'scheduled', 'published', 'failed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.social_post_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'published', 'failed', 'cancelled')),
  job_id TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (social_post_id)
);

CREATE INDEX IF NOT EXISTS idx_social_post_schedules_user_id ON public.social_post_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_social_post_schedules_campaign_id ON public.social_post_schedules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_post_schedules_status ON public.social_post_schedules(status);
CREATE INDEX IF NOT EXISTS idx_social_post_schedules_scheduled_at ON public.social_post_schedules(scheduled_at);

ALTER TABLE public.social_post_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'social_post_schedules'
      AND policyname = 'Users can manage own social post schedules'
  ) THEN
    CREATE POLICY "Users can manage own social post schedules"
      ON public.social_post_schedules
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;
