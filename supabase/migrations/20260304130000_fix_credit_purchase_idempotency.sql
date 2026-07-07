-- Deduplicate historical credit purchase rows caused by webhook retries
-- and enforce idempotency at DB level for future events.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'credit_purchases'
  ) THEN
    -- Keep earliest row per payment intent, delete duplicates.
    WITH ranked_by_pi AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY stripe_payment_intent_id
          ORDER BY created_at ASC, id ASC
        ) AS rn
      FROM public.credit_purchases
      WHERE stripe_payment_intent_id IS NOT NULL
    )
    DELETE FROM public.credit_purchases cp
    USING ranked_by_pi r
    WHERE cp.id = r.id
      AND r.rn > 1;

    -- Keep earliest row per checkout session, delete duplicates.
    WITH ranked_by_session AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY stripe_checkout_session_id
          ORDER BY created_at ASC, id ASC
        ) AS rn
      FROM public.credit_purchases
      WHERE stripe_checkout_session_id IS NOT NULL
    )
    DELETE FROM public.credit_purchases cp
    USING ranked_by_session r
    WHERE cp.id = r.id
      AND r.rn > 1;

    -- Enforce idempotency for Stripe identifiers.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_purchases_unique_payment_intent
      ON public.credit_purchases (stripe_payment_intent_id)
      WHERE stripe_payment_intent_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_purchases_unique_checkout_session
      ON public.credit_purchases (stripe_checkout_session_id)
      WHERE stripe_checkout_session_id IS NOT NULL;
  END IF;
END $$;
