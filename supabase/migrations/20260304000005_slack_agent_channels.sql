-- Slack channel routing/indexes for agent_channels
-- Safe additive migration: only applies if agent_channels exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'agent_channels'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_agent_channels_slack_agent_active
      ON public.agent_channels (agent_key, is_active)
      WHERE channel_type = 'slack';

    CREATE INDEX IF NOT EXISTS idx_agent_channels_slack_team_channel_active
      ON public.agent_channels (
        (provider_config->>'team_id'),
        (provider_config->>'channel_id'),
        is_active
      )
      WHERE channel_type = 'slack';

    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_channels_slack_unique_team_channel_agent
      ON public.agent_channels (
        (provider_config->>'team_id'),
        (provider_config->>'channel_id'),
        agent_key
      )
      WHERE channel_type = 'slack';
  END IF;
END $$;
