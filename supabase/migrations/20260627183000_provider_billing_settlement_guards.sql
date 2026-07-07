-- Settlement guards for provider billing attempts.
-- The reconciler claims one row before immediate settlement and ai_usage_events cannot
-- contain two settled rows for the same provider attempt.

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_events_provider_billing_attempt_uidx
  ON public.ai_usage_events(provider_billing_attempt_id)
  WHERE provider_billing_attempt_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_provider_billing_attempt(
  p_attempt_id UUID,
  p_worker_id TEXT DEFAULT NULL
)
RETURNS public.provider_billing_attempts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  claimed public.provider_billing_attempts;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RETURN NULL;
  END IF;

  WITH candidate AS (
    SELECT id
    FROM public.provider_billing_attempts
    WHERE id = p_attempt_id
      AND ai_usage_event_id IS NULL
      AND status NOT IN ('settled', 'no_charge', 'unrecoverable')
      AND (
        status <> 'settling'
        OR locked_at IS NULL
        OR locked_at <= now() - INTERVAL '15 minutes'
      )
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.provider_billing_attempts attempt
  SET
    status = 'settling',
    attempts = attempt.attempts + 1,
    locked_by = COALESCE(NULLIF(p_worker_id, ''), 'provider-billing-immediate'),
    locked_at = now(),
    updated_at = now()
  FROM candidate
  WHERE attempt.id = candidate.id
  RETURNING attempt.* INTO claimed;

  RETURN claimed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_provider_billing_attempt(UUID, TEXT) TO service_role;
