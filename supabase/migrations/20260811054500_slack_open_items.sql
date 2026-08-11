BEGIN;

CREATE TABLE IF NOT EXISTS public.slack_open_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('question', 'client_ask', 'commitment', 'risk')),
  subject_person_id uuid REFERENCES public.channel_members(id) ON DELETE SET NULL,
  client_label text,
  channel_id text NOT NULL,
  source_message_ts text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'resolved', 'stale')),
  first_seen_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL,
  times_surfaced integer NOT NULL DEFAULT 0,
  last_surfaced_at timestamptz,
  resolution_note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slack_open_items_source_unique UNIQUE (org_id, channel_id, source_message_ts)
);

CREATE INDEX IF NOT EXISTS idx_slack_open_items_org_status_activity
  ON public.slack_open_items (org_id, status, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_open_items_subject_status
  ON public.slack_open_items (subject_person_id, status, first_seen_at)
  WHERE subject_person_id IS NOT NULL;

ALTER TABLE public.slack_open_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY slack_open_items_org_admin_all ON public.slack_open_items FOR ALL
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

CREATE TRIGGER set_updated_at_slack_open_items
  BEFORE UPDATE ON public.slack_open_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.slack_open_items TO authenticated, service_role;

COMMENT ON TABLE public.slack_open_items IS
  'Durable Slack question, ask, commitment, and risk ledger for cross-day Pixel continuity.';

COMMIT;
