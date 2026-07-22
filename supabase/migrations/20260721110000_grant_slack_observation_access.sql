-- Observation ledger migration enabled RLS but omitted base table privileges.
-- Same failure mode as slack_shadow_actions: API service_role gets permission denied,
-- which makes Team → People show "Could not load your Slack people" + fake disconnected.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.slack_observation_channels,
     public.slack_observation_channel_members,
     public.slack_observation_events,
     public.slack_observation_consumers
  TO authenticated, service_role;
