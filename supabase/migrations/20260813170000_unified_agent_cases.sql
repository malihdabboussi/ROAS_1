BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope_level text NOT NULL DEFAULT 'company' CHECK (
    scope_level IN ('company', 'client', 'campaign')
  ),
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  space_id uuid REFERENCES public.spaces(id) ON DELETE SET NULL,
  external_client_id text,
  case_type text NOT NULL CHECK (
    case_type IN (
      'unanswered_ask',
      'client_ask',
      'commitment',
      'client_risk',
      'quality_control',
      'proactive_launch',
      'campaign_quality_control',
      'post_call',
      'offer'
    )
  ),
  source_type text NOT NULL,
  source_key text NOT NULL,
  subject_person_id uuid REFERENCES public.channel_members(id) ON DELETE SET NULL,
  client_label text,
  channel_id text,
  source_message_ts text,
  summary text NOT NULL,
  severity text NOT NULL DEFAULT 'normal' CHECK (
    severity IN ('low', 'normal', 'high', 'critical')
  ),
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'acknowledged', 'snoozed', 'answered', 'resolved', 'stale')
  ),
  first_seen_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL,
  due_at timestamptz,
  breach_notified_at timestamptz,
  snoozed_until timestamptz,
  times_surfaced integer NOT NULL DEFAULT 0,
  last_surfaced_at timestamptz,
  resolution_note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_cases_source_unique UNIQUE (org_id, source_type, source_key)
);

INSERT INTO public.agent_cases (
  id,
  org_id,
  case_type,
  source_type,
  source_key,
  subject_person_id,
  client_label,
  channel_id,
  source_message_ts,
  summary,
  status,
  first_seen_at,
  last_activity_at,
  due_at,
  times_surfaced,
  last_surfaced_at,
  resolution_note,
  metadata,
  created_at,
  updated_at
)
SELECT
  id,
  org_id,
  CASE kind
    WHEN 'question' THEN 'unanswered_ask'
    WHEN 'risk' THEN 'client_risk'
    ELSE kind
  END,
  'slack_message',
  concat(slack_open_items.channel_id, ':', slack_open_items.source_message_ts),
  subject_person_id,
  client_label,
  channel_id,
  source_message_ts,
  summary,
  status,
  first_seen_at,
  last_activity_at,
  CASE WHEN kind = 'question' THEN first_seen_at + interval '24 hours' ELSE NULL END,
  times_surfaced,
  last_surfaced_at,
  resolution_note,
  metadata || jsonb_build_object('legacy_slack_open_item', true),
  created_at,
  updated_at
FROM public.slack_open_items
ON CONFLICT (org_id, source_type, source_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_agent_cases_org_status_activity
  ON public.agent_cases (org_id, status, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_cases_scope_status
  ON public.agent_cases (org_id, program_id, campaign_id, space_id, status, first_seen_at);
CREATE INDEX IF NOT EXISTS idx_agent_cases_due_open
  ON public.agent_cases (org_id, due_at)
  WHERE status = 'open' AND due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_cases_subject_status
  ON public.agent_cases (subject_person_id, status, first_seen_at)
  WHERE subject_person_id IS NOT NULL;

ALTER TABLE public.agent_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_cases_org_admin_all ON public.agent_cases FOR ALL
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));
CREATE TRIGGER set_updated_at_agent_cases
  BEFORE UPDATE ON public.agent_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_cases TO authenticated, service_role;

COMMENT ON TABLE public.agent_cases IS
  'Unified company, client, and campaign case ledger for Slack asks, Page Grader QC/launch findings, post-call work, offers, and other Pixel producers.';
COMMENT ON TABLE public.slack_open_items IS
  'Legacy rollback copy. Active Pixel case reads and writes moved to agent_cases in August 2026.';

COMMIT;
