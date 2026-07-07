-- Provider billing attempts keep a durable provider identity before settlement.
-- This lets OpenRouter generations reconcile after interrupted streams or delayed cost indexing.

CREATE TABLE IF NOT EXISTS public.provider_billing_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_key TEXT NOT NULL,
  source_app TEXT NOT NULL,
  source_path TEXT NOT NULL,
  billing_owner_type TEXT NOT NULL DEFAULT 'personal'
    CHECK (billing_owner_type IN ('personal', 'org', 'platform', 'subscription')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  conversation_id UUID,
  feature TEXT NOT NULL,
  action TEXT,
  service_type TEXT NOT NULL DEFAULT 'text',
  provider TEXT NOT NULL,
  requested_model TEXT,
  resolved_model TEXT,
  provider_generation_id TEXT,
  provider_request_id TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  provider_cost_usd NUMERIC(12,6),
  estimated_cost_usd NUMERIC(12,6),
  final_cost_usd NUMERIC(12,6),
  credits_calculated INTEGER,
  credits_charged INTEGER,
  ai_usage_event_id UUID REFERENCES public.ai_usage_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_provider_id'
    CHECK (
      status IN (
        'pending_provider_id',
        'pending_settlement',
        'settling',
        'settled',
        'no_charge',
        'failed_retryable',
        'unrecoverable',
        'charge_failed'
      )
    ),
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_billing_attempts_attempt_key_uidx
  ON public.provider_billing_attempts(attempt_key);

CREATE UNIQUE INDEX IF NOT EXISTS provider_billing_attempts_provider_generation_uidx
  ON public.provider_billing_attempts(provider, provider_generation_id)
  WHERE provider_generation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS provider_billing_attempts_status_next_attempt_idx
  ON public.provider_billing_attempts(status, next_attempt_at);

CREATE INDEX IF NOT EXISTS provider_billing_attempts_owner_idx
  ON public.provider_billing_attempts(user_id, org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS provider_billing_attempts_conversation_idx
  ON public.provider_billing_attempts(conversation_id, created_at DESC);

CREATE TRIGGER update_provider_billing_attempts_updated_at
  BEFORE UPDATE ON public.provider_billing_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.provider_billing_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full" ON public.provider_billing_attempts;
CREATE POLICY "service_role_full" ON public.provider_billing_attempts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.ai_usage_events
  ADD COLUMN IF NOT EXISTS provider_billing_attempt_id UUID
    REFERENCES public.provider_billing_attempts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_settlement_status TEXT;

CREATE INDEX IF NOT EXISTS ai_usage_events_provider_billing_attempt_idx
  ON public.ai_usage_events(provider_billing_attempt_id);

CREATE INDEX IF NOT EXISTS ai_usage_events_billing_settlement_status_idx
  ON public.ai_usage_events(billing_settlement_status);

CREATE OR REPLACE FUNCTION public.claim_provider_billing_attempts(
  p_limit INTEGER DEFAULT 25,
  p_worker_id TEXT DEFAULT NULL
)
RETURNS SETOF public.provider_billing_attempts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.provider_billing_attempts
    WHERE (
        status IN ('pending_settlement', 'failed_retryable')
        AND next_attempt_at <= now()
      )
      OR (
        status = 'pending_provider_id'
        AND created_at <= now() - INTERVAL '2 hours'
      )
    ORDER BY next_attempt_at ASC, created_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 25), 250))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.provider_billing_attempts attempt
  SET
    status = 'settling',
    attempts = attempt.attempts + 1,
    locked_by = COALESCE(NULLIF(p_worker_id, ''), 'provider-billing-reconciler'),
    locked_at = now(),
    updated_at = now()
  FROM candidates
  WHERE attempt.id = candidates.id
  RETURNING attempt.*;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_provider_billing_attempts(INTEGER, TEXT) TO service_role;

COMMENT ON TABLE public.provider_billing_attempts IS
  'Durable provider-level billing attempts used to settle exact provider costs after streaming or async completion.';

COMMENT ON COLUMN public.provider_billing_attempts.attempt_key IS
  'Caller-supplied idempotency key for a billable provider attempt.';

COMMENT ON COLUMN public.provider_billing_attempts.provider_generation_id IS
  'Provider generation identifier, for OpenRouter usually x-generation-id or response/body id.';
