-- ROAS drift recovery: tables created directly on Vibey live, never checked into migrations.
-- Reconstructed from app contracts, seed migrations, and dependent ALTER migrations.
-- Skip legacy brain_belief_patterns / brain_emotional_responses (dropped by 015; use ns_* tables).

-- =============================================================================
-- skill_library + resources + template_skill_assignments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.skill_library (
  skill_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  markdown_content TEXT NOT NULL DEFAULT '',
  category TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.skill_library_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_key TEXT NOT NULL REFERENCES public.skill_library(skill_key) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'text/markdown',
  storage_url TEXT,
  UNIQUE (skill_key, file_path)
);

CREATE TABLE IF NOT EXISTS public.template_skill_assignments (
  template_key TEXT NOT NULL,
  skill_key TEXT NOT NULL REFERENCES public.skill_library(skill_key) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_key, skill_key)
);

ALTER TABLE public.skill_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_skill_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- user_notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  channel_sent JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_org_id ON public.user_notifications(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_notifications_mission_id ON public.user_notifications(mission_id) WHERE mission_id IS NOT NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.user_notifications;
CREATE POLICY "Users can read own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- social_posts + social_post_schedules
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  post_type TEXT NOT NULL,
  caption TEXT,
  headline TEXT,
  generated_tsx TEXT,
  image_url TEXT,
  image_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  video_url TEXT,
  video_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  carousel_slides JSONB,
  hashtags TEXT[],
  cta_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_posts_status_check CHECK (
    status IN ('draft', 'ready', 'scheduled', 'published', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_campaign_id ON public.social_posts(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_org ON public.social_posts(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_space_id ON public.social_posts(space_id) WHERE space_id IS NOT NULL;

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_social_posts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS social_posts_updated_at ON public.social_posts;
CREATE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_social_posts_timestamp();

DROP POLICY IF EXISTS "Users can view own social posts" ON public.social_posts;
CREATE POLICY "Users can view own social posts"
  ON public.social_posts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own social posts" ON public.social_posts;
CREATE POLICY "Users can insert own social posts"
  ON public.social_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own social posts" ON public.social_posts;
CREATE POLICY "Users can update own social posts"
  ON public.social_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own social posts" ON public.social_posts;
CREATE POLICY "Users can delete own social posts"
  ON public.social_posts FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access social_posts" ON public.social_posts;
CREATE POLICY "Service role full access social_posts"
  ON public.social_posts FOR ALL
  USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.social_post_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'processing', 'published', 'failed', 'cancelled')
  ),
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
CREATE INDEX IF NOT EXISTS idx_social_post_schedules_org ON public.social_post_schedules(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_post_schedules_status ON public.social_post_schedules(status);
CREATE INDEX IF NOT EXISTS idx_social_post_schedules_scheduled_at ON public.social_post_schedules(scheduled_at);

ALTER TABLE public.social_post_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own social post schedules" ON public.social_post_schedules;
CREATE POLICY "Users can manage own social post schedules"
  ON public.social_post_schedules FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- agent_channels
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agent_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  provider_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_channels_user_id ON public.agent_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_channels_org_id ON public.agent_channels(org_id) WHERE org_id IS NOT NULL;

ALTER TABLE public.agent_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agent channels" ON public.agent_channels;
CREATE POLICY "Users can view own agent channels"
  ON public.agent_channels FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own agent channels" ON public.agent_channels;
CREATE POLICY "Users can insert own agent channels"
  ON public.agent_channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own agent channels" ON public.agent_channels;
CREATE POLICY "Users can update own agent channels"
  ON public.agent_channels FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own agent channels" ON public.agent_channels;
CREATE POLICY "Users can delete own agent channels"
  ON public.agent_channels FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- app_errors (service-role only; RLS deny-all for anon/authenticated)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  app TEXT NOT NULL,
  environment TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  feature TEXT,
  error_code TEXT,
  message TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  stack TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT,
  agent_key TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON public.app_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_user_id ON public.app_errors(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.app_errors IS
  'Service-role only. Inserted by error-reporter across apps; read by /api/admin/errors via backend (service-role). RLS enabled with no policy = deny-all to anon/authenticated.';

-- =============================================================================
-- billing_health_log + billing_health_checks (service-role only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.billing_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  feature TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  model_name TEXT,
  reason TEXT NOT NULL,
  error_message TEXT,
  usage_json JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_billing_health_log_unresolved
  ON public.billing_health_log(resolved, created_at DESC)
  WHERE resolved = false;

ALTER TABLE public.billing_health_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.billing_health_log IS
  'Service-role only. Written by track-billed-cost / artifacts-legacy; read by admin service. RLS enabled with no policy.';

CREATE TABLE IF NOT EXISTS public.billing_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_date DATE NOT NULL UNIQUE,
  openrouter_reported_cost NUMERIC,
  db_computed_cost NUMERIC NOT NULL DEFAULT 0,
  delta_percent NUMERIC,
  openrouter_request_count INTEGER,
  db_event_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_health_checks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.billing_health_checks IS
  'Service-role only. Internal billing health probes. RLS enabled with no policy.';
