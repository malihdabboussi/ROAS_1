BEGIN;

ALTER TABLE public.slack_observation_channels
  ADD COLUMN IF NOT EXISTS is_excluded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclusion_reason text,
  ADD COLUMN IF NOT EXISTS join_status text NOT NULL DEFAULT 'discovered',
  ADD COLUMN IF NOT EXISTS last_join_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS join_error text;

ALTER TABLE public.slack_observation_channels
  DROP CONSTRAINT IF EXISTS slack_observation_channels_join_status_check;

ALTER TABLE public.slack_observation_channels
  ADD CONSTRAINT slack_observation_channels_join_status_check
  CHECK (join_status IN ('discovered', 'joined', 'observed', 'excluded', 'inaccessible'));

UPDATE public.slack_observation_channels
SET join_status = CASE
  WHEN is_excluded THEN 'excluded'
  WHEN last_reconciled_at IS NOT NULL THEN 'observed'
  WHEN is_member THEN 'joined'
  ELSE 'discovered'
END;

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
    org_id, slack_team_id, channel_id, last_message_ts, last_reconciled_at, join_status
  )
  VALUES (p_org_id, p_slack_team_id, p_channel_id, p_last_message_ts, now(), 'observed')
  ON CONFLICT (org_id, slack_team_id, channel_id)
  DO UPDATE SET
    last_message_ts = CASE
      WHEN slack_observation_channels.last_message_ts IS NULL
        OR slack_observation_channels.last_message_ts::numeric < EXCLUDED.last_message_ts::numeric
      THEN EXCLUDED.last_message_ts
      ELSE slack_observation_channels.last_message_ts
    END,
    last_reconciled_at = now(),
    join_status = 'observed',
    updated_at = now();
$$;

CREATE TABLE IF NOT EXISTS public.slack_signal_playbook_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_signal_id uuid REFERENCES public.slack_shadow_actions(id) ON DELETE SET NULL,
  instruction text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_signal_playbook_rules_org_enabled
  ON public.slack_signal_playbook_rules (org_id, is_enabled, created_at);

ALTER TABLE public.slack_signal_playbook_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS slack_signal_playbook_rules_org_admin_all
  ON public.slack_signal_playbook_rules;
CREATE POLICY slack_signal_playbook_rules_org_admin_all
  ON public.slack_signal_playbook_rules FOR ALL
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

DROP TRIGGER IF EXISTS set_updated_at_slack_signal_playbook_rules
  ON public.slack_signal_playbook_rules;
CREATE TRIGGER set_updated_at_slack_signal_playbook_rules
  BEFORE UPDATE ON public.slack_signal_playbook_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.slack_signal_playbook_rules
  TO authenticated, service_role;

UPDATE public.integrations_available
SET metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{scopes}',
  coalesce(metadata->'scopes', '[]'::jsonb) || '["channels:join"]'::jsonb
),
updated_at = now()
WHERE id = 'slack'
  AND NOT (coalesce(metadata->'scopes', '[]'::jsonb) ? 'channels:join');

INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
VALUES (
  NULL,
  NULL,
  'vibey',
  'slack-signal-operator',
  'Slack Signal Operator',
  'Turns observed Slack evidence and administrator coaching into safe internal Shadow action plans.',
  '# Slack Signal Operator

Use this skill when Pixel surfaces an unanswered question, workflow opportunity, stalled commitment, or client risk from Slack.

## Safety

- Never proactively message an external or ignored person.
- Convert external signals into internal action plans.
- Draft only in Shadow until an administrator approves the exact message.
- Use a group DM only when the administrator explicitly names multiple internal recipients.
- Preserve the source channel, message, author, time, rationale, and confidence.

## Learning

When an administrator saves coaching as a reusable rule, apply it to future analysis as guidance. Treat the instruction as routing and response policy, not as permission to send.

## Example

For a client asking for payment instructions, a replay, and book-review context: route payment to Janine, the replay to Nefi and Betty when explicitly requested as a group, and book context to Nate. Keep the client as evidence context only.',
  true,
  'system'
)
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

COMMIT;
