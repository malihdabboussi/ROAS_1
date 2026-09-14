-- Meeting note-taker intake (ROA-40, Phase 0)
-- 1. Replay protection for the shared meeting webhook door.
-- 2. Fast lookup of a connection by its per-connection webhook key.
-- 3. Widen the external automation provider check so Fireflies and Read.ai
--    recordings can claim events like Fathom does.

CREATE TABLE IF NOT EXISTS public.meeting_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.user_integrations(id) ON DELETE CASCADE,
  delivery_id TEXT NOT NULL,
  external_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meeting_webhook_deliveries_unique UNIQUE (provider, connection_id, delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_webhook_deliveries_connection
  ON public.meeting_webhook_deliveries (connection_id, received_at DESC);

ALTER TABLE public.meeting_webhook_deliveries ENABLE ROW LEVEL SECURITY;
-- Service role only: no user policies on purpose. Rows are written by the API
-- webhook receiver and never read by clients.

CREATE INDEX IF NOT EXISTS idx_user_integrations_webhook_key
  ON public.user_integrations ((metadata->>'webhook_key'))
  WHERE metadata ? 'webhook_key';

ALTER TABLE public.space_external_automation_triggers
  DROP CONSTRAINT IF EXISTS space_external_automation_triggers_provider_check;
ALTER TABLE public.space_external_automation_triggers
  ADD CONSTRAINT space_external_automation_triggers_provider_check
  CHECK (provider IN ('gmail', 'outlook', 'fathom', 'fireflies', 'read_ai'));

ALTER TABLE public.space_external_automation_events
  DROP CONSTRAINT IF EXISTS space_external_automation_events_provider_check;
ALTER TABLE public.space_external_automation_events
  ADD CONSTRAINT space_external_automation_events_provider_check
  CHECK (provider IN ('gmail', 'outlook', 'fathom', 'fireflies', 'read_ai'));
