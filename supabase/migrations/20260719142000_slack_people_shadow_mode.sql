-- Durable Slack people directory and review-first Shadow Mode controls.

ALTER TABLE public.channel_members
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS vibey_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS relationship_kind text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'shadow',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.channel_members
  DROP CONSTRAINT IF EXISTS channel_members_relationship_kind_check,
  ADD CONSTRAINT channel_members_relationship_kind_check
    CHECK (relationship_kind IN ('team_member', 'external', 'unknown')),
  DROP CONSTRAINT IF EXISTS channel_members_delivery_mode_check,
  ADD CONSTRAINT channel_members_delivery_mode_check
    CHECK (delivery_mode IN ('off', 'shadow', 'active'));

CREATE INDEX IF NOT EXISTS idx_channel_members_org_platform_seen
  ON public.channel_members (org_id, platform, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_members_vibey_user
  ON public.channel_members (vibey_user_id)
  WHERE vibey_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_channel_members_contact
  ON public.channel_members (contact_id)
  WHERE contact_id IS NOT NULL;

DROP POLICY IF EXISTS channel_members_org_admin_read ON public.channel_members;
CREATE POLICY channel_members_org_admin_read ON public.channel_members
  FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS channel_members_org_admin_update ON public.channel_members;
CREATE POLICY channel_members_org_admin_update ON public.channel_members
  FOR UPDATE
  USING (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id));

CREATE TABLE IF NOT EXISTS public.slack_shadow_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_key text NOT NULL,
  target_member_id uuid REFERENCES public.channel_members(id) ON DELETE SET NULL,
  action_kind text NOT NULL,
  proposed_content text NOT NULL,
  rationale text,
  status text NOT NULL DEFAULT 'proposed',
  source_channel_id text,
  source_message_ts text,
  workflow_key text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  sent_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slack_shadow_actions_kind_check CHECK (action_kind IN ('message', 'workflow')),
  CONSTRAINT slack_shadow_actions_status_check
    CHECK (status IN ('proposed', 'approved', 'dismissed', 'sending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_slack_shadow_actions_org_created
  ON public.slack_shadow_actions (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_slack_shadow_actions_target_status
  ON public.slack_shadow_actions (target_member_id, status, created_at DESC);

ALTER TABLE public.slack_shadow_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY slack_shadow_actions_org_admin_read ON public.slack_shadow_actions
  FOR SELECT
  USING (public.is_org_admin_or_owner(org_id));

CREATE POLICY slack_shadow_actions_org_admin_update ON public.slack_shadow_actions
  FOR UPDATE
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

CREATE POLICY slack_shadow_actions_owner_insert ON public.slack_shadow_actions
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_org_admin_or_owner(org_id));

CREATE TRIGGER set_updated_at_slack_shadow_actions
  BEFORE UPDATE ON public.slack_shadow_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.slack_shadow_actions IS
  'Admin-review ledger for Slack messages and workflows proposed without delivery in Shadow Mode.';
