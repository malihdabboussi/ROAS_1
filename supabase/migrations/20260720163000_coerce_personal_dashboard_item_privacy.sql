-- Personal Dashboard items must stay private. Coerce privacy fields instead of
-- raising, so agent/prep/create paths that omit is_private do not fail.
CREATE OR REPLACE FUNCTION public.protect_personal_dashboard_item_sharing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.spaces
    WHERE id = NEW.space_id
      AND space_kind = 'personal_dashboard'
  ) THEN
    NEW.is_private := true;
    NEW.share_link_enabled := false;
    NEW.share_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_personal_dashboard_item_sharing() FROM PUBLIC;
