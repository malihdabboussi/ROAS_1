BEGIN;
-- Per-turn telemetry for Slack Pixel (North Star §11.0). One row per inbound
-- Slack turn Pixel answers: which ask kind was stamped, how the client was
-- resolved, which tools ran (ordered), how long it took, and whether the reply
-- asked a forbidden clarifying question. This is what the nightly R-catalog
-- harness and the "did Pixel look deep enough" metrics read from.
CREATE TABLE IF NOT EXISTS public.slack_pixel_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  slack_team_id text NOT NULL,
  channel_id text NOT NULL,
  thread_ts text,
  message_ts text,
  slack_user_id text,
  agent_key text NOT NULL,
  conversation_id uuid,
  ask_kind text NOT NULL CHECK (ask_kind IN ('continuation','client','team','general','unclear')),
  kind_signals text[] NOT NULL DEFAULT '{}',
  client_source text CHECK (client_source IS NULL OR client_source IN ('stamp','quote','hint','named','none')),
  client_id text,
  tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
  tool_count integer NOT NULL DEFAULT 0,
  message_chars integer NOT NULL DEFAULT 0,
  reply_chars integer NOT NULL DEFAULT 0,
  duration_ms integer,
  outcome text NOT NULL CHECK (outcome IN ('replied','no_answer','error')),
  error text,
  forbidden_ask boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slack_pixel_turns_org_created ON public.slack_pixel_turns (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_pixel_turns_kind ON public.slack_pixel_turns (org_id, ask_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_pixel_turns_conversation ON public.slack_pixel_turns (conversation_id) WHERE conversation_id IS NOT NULL;
ALTER TABLE public.slack_pixel_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY slack_pixel_turns_org_admin_read ON public.slack_pixel_turns FOR SELECT USING (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id));
GRANT SELECT ON public.slack_pixel_turns TO authenticated;
GRANT SELECT, INSERT ON public.slack_pixel_turns TO service_role;
COMMIT;
