CREATE TABLE public.billing_credit_slack_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  threshold_percent integer NOT NULL CHECK (threshold_percent IN (70, 90, 100)),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
  slack_message_ts text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (org_id, recipient_user_id, period_start, threshold_percent)
);

ALTER TABLE public.billing_credit_slack_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access billing credit Slack alerts"
  ON public.billing_credit_slack_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX billing_credit_slack_alerts_org_period_idx
  ON public.billing_credit_slack_alerts (org_id, period_start DESC);
