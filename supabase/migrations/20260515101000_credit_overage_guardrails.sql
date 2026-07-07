-- Prevent billing ledgers from recording purchased credit usage above the purchased wallet.
-- Manual/admin repair can bypass inside a transaction with:
--   SET LOCAL app.allow_credit_overage = 'true';

CREATE OR REPLACE FUNCTION public.prevent_personal_credit_overage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  purchased_total integer;
BEGIN
  IF current_setting('app.allow_credit_overage', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(credits_purchased), 0)::integer
  INTO purchased_total
  FROM public.credit_purchases
  WHERE user_id = NEW.user_id
    AND status = 'completed';

  IF COALESCE(NEW.purchased_credits_used, 0) > purchased_total THEN
    RAISE EXCEPTION 'credit_overage_not_allowed'
      USING ERRCODE = 'P0001',
            DETAIL = format(
              'user_id=%s purchased_credits_used=%s purchased_total=%s',
              NEW.user_id,
              COALESCE(NEW.purchased_credits_used, 0),
              purchased_total
            );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_personal_credit_overage_on_monthly_usage
  ON public.monthly_credit_usage;

CREATE TRIGGER prevent_personal_credit_overage_on_monthly_usage
  BEFORE INSERT OR UPDATE OF user_id, purchased_credits_used
  ON public.monthly_credit_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_personal_credit_overage();

CREATE OR REPLACE FUNCTION public.prevent_org_credit_overage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  purchased_total integer;
BEGIN
  IF current_setting('app.allow_credit_overage', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(credits_purchased), 0)::integer
  INTO purchased_total
  FROM public.org_credit_purchases
  WHERE org_id = NEW.org_id
    AND status = 'completed';

  IF COALESCE(NEW.purchased_credits_used, 0) > purchased_total THEN
    RAISE EXCEPTION 'org_credit_overage_not_allowed'
      USING ERRCODE = 'P0001',
            DETAIL = format(
              'org_id=%s purchased_credits_used=%s purchased_total=%s',
              NEW.org_id,
              COALESCE(NEW.purchased_credits_used, 0),
              purchased_total
            );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_org_credit_overage_on_monthly_usage
  ON public.org_monthly_credit_usage;

CREATE TRIGGER prevent_org_credit_overage_on_monthly_usage
  BEFORE INSERT OR UPDATE OF org_id, purchased_credits_used
  ON public.org_monthly_credit_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_org_credit_overage();
