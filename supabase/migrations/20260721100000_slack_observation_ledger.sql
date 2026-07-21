BEGIN;

CREATE TABLE IF NOT EXISTS public.slack_observation_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slack_team_id text NOT NULL,
  channel_id text NOT NULL,
  channel_name text NOT NULL DEFAULT '',
  is_private boolean NOT NULL DEFAULT false,
  is_member boolean NOT NULL DEFAULT true,
  last_message_ts text,
  last_discovered_at timestamptz NOT NULL DEFAULT now(),
  last_reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slack_observation_channels_workspace_channel_unique
    UNIQUE (org_id, slack_team_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_observation_channels_org_member
  ON public.slack_observation_channels (org_id, is_member, channel_name);

CREATE TABLE IF NOT EXISTS public.slack_observation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slack_team_id text NOT NULL,
  channel_id text NOT NULL,
  channel_name text,
  message_ts text NOT NULL,
  thread_ts text,
  sender_slack_user_id text,
  text text NOT NULL,
  is_bot boolean NOT NULL DEFAULT false,
  source text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT slack_observation_events_source_check
    CHECK (source IN ('webhook', 'reconciliation', 'backfill')),
  CONSTRAINT slack_observation_events_workspace_message_unique
    UNIQUE (org_id, slack_team_id, channel_id, message_ts)
);

CREATE INDEX IF NOT EXISTS idx_slack_observation_events_org_ts
  ON public.slack_observation_events (org_id, slack_team_id, message_ts);

CREATE INDEX IF NOT EXISTS idx_slack_observation_events_sender_ts
  ON public.slack_observation_events (org_id, sender_slack_user_id, message_ts)
  WHERE sender_slack_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_slack_observation_events_thread
  ON public.slack_observation_events (org_id, channel_id, thread_ts, message_ts)
  WHERE thread_ts IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.slack_observation_channel_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slack_team_id text NOT NULL,
  member_slack_user_id text NOT NULL,
  channel_name text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, slack_team_id, member_slack_user_id, channel_name)
);

CREATE INDEX IF NOT EXISTS idx_slack_observation_channel_members_channel
  ON public.slack_observation_channel_members (org_id, channel_name);

CREATE TABLE IF NOT EXISTS public.slack_observation_consumers (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slack_team_id text NOT NULL,
  consumer_key text NOT NULL,
  last_message_ts text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, slack_team_id, consumer_key)
);

ALTER TABLE public.slack_observation_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_observation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_observation_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_observation_consumers ENABLE ROW LEVEL SECURITY;

CREATE POLICY slack_observation_channels_org_admin_all
  ON public.slack_observation_channels FOR ALL
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

CREATE POLICY slack_observation_events_org_admin_all
  ON public.slack_observation_events FOR ALL
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

CREATE POLICY slack_observation_channel_members_org_admin_all
  ON public.slack_observation_channel_members FOR ALL
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

CREATE POLICY slack_observation_consumers_org_admin_all
  ON public.slack_observation_consumers FOR ALL
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

CREATE OR REPLACE FUNCTION public.advance_slack_observation_cursor(
  p_org_id uuid,
  p_slack_team_id text,
  p_channel_id text,
  p_last_message_ts text
)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO public.slack_observation_channels (
    org_id,
    slack_team_id,
    channel_id,
    last_message_ts,
    last_reconciled_at
  )
  VALUES (
    p_org_id,
    p_slack_team_id,
    p_channel_id,
    p_last_message_ts,
    now()
  )
  ON CONFLICT (org_id, slack_team_id, channel_id)
  DO UPDATE SET
    last_message_ts = CASE
      WHEN slack_observation_channels.last_message_ts IS NULL
        OR slack_observation_channels.last_message_ts::numeric < EXCLUDED.last_message_ts::numeric
      THEN EXCLUDED.last_message_ts
      ELSE slack_observation_channels.last_message_ts
    END,
    last_reconciled_at = now(),
    updated_at = now();
$$;

CREATE OR REPLACE FUNCTION public.advance_slack_observation_consumer(
  p_org_id uuid,
  p_slack_team_id text,
  p_consumer_key text,
  p_last_message_ts text
)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO public.slack_observation_consumers (
    org_id,
    slack_team_id,
    consumer_key,
    last_message_ts
  )
  VALUES (
    p_org_id,
    p_slack_team_id,
    p_consumer_key,
    p_last_message_ts
  )
  ON CONFLICT (org_id, slack_team_id, consumer_key)
  DO UPDATE SET
    last_message_ts = CASE
      WHEN slack_observation_consumers.last_message_ts::numeric < EXCLUDED.last_message_ts::numeric
      THEN EXCLUDED.last_message_ts
      ELSE slack_observation_consumers.last_message_ts
    END,
    updated_at = now();
$$;

CREATE TRIGGER set_updated_at_slack_observation_channels
  BEFORE UPDATE ON public.slack_observation_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.slack_observation_events IS
  'Canonical Slack message ledger consumed by proactive loops and Brain backfills without repeated Slack downloads.';

COMMENT ON TABLE public.slack_observation_channels IS
  'Persisted Slack channel index and exact incremental reconciliation cursor per organization workspace channel.';

COMMIT;
