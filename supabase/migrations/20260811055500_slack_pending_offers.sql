BEGIN;
CREATE TABLE IF NOT EXISTS public.slack_pending_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_person_id uuid NOT NULL REFERENCES public.channel_members(id) ON DELETE CASCADE,
  shadow_action_id uuid REFERENCES public.slack_shadow_actions(id) ON DELETE SET NULL,
  thread_channel_id text,
  thread_ts text,
  deliverable_kind text NOT NULL,
  spec jsonb NOT NULL,
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','accepted','in_progress','delivered','declined','expired','missed')),
  accepted_via text CHECK (accepted_via IS NULL OR accepted_via IN ('reaction','thread_reply')),
  promised_by timestamptz,
  delivered_at timestamptz,
  artifact_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slack_pending_offers_thread ON public.slack_pending_offers (org_id, thread_channel_id, thread_ts) WHERE status = 'offered';
CREATE INDEX IF NOT EXISTS idx_slack_pending_offers_promise ON public.slack_pending_offers (status, promised_by) WHERE status IN ('accepted','in_progress');
ALTER TABLE public.slack_pending_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY slack_pending_offers_org_admin_all ON public.slack_pending_offers FOR ALL USING (public.is_org_admin_or_owner(org_id)) WITH CHECK (public.is_org_admin_or_owner(org_id));
CREATE TRIGGER set_updated_at_slack_pending_offers BEFORE UPDATE ON public.slack_pending_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slack_pending_offers TO authenticated, service_role;
COMMIT;
