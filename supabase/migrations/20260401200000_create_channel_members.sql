-- channel_members: tracks individual people who interact with Vibey via Slack/Telegram.
-- Works for team members (Slack workspace) and external customers (public Telegram bots).
-- The user_id FK points to the Vibey account owner, not the channel member themselves.

CREATE TABLE IF NOT EXISTS public.channel_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES public.organizations(id),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL CHECK (platform IN ('slack', 'telegram')),
  platform_id   TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT '',
  username      TEXT,
  avatar_url    TEXT,
  title         TEXT,
  timezone      TEXT,
  is_bot        BOOLEAN NOT NULL DEFAULT false,
  notes         JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.channel_members
  ADD CONSTRAINT channel_members_unique_member
  UNIQUE NULLS NOT DISTINCT (user_id, platform, platform_id, org_id);

CREATE INDEX IF NOT EXISTS channel_members_user_platform
  ON public.channel_members (user_id, platform);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.channel_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY channel_members_own ON public.channel_members
  FOR ALL USING (user_id = auth.uid());
