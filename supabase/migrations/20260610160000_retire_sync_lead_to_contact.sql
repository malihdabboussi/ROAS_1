-- Retire the prod-only sync_lead_to_contact trigger.
-- The funnel lead -> contact mirror now lives entirely in the app layer
-- (LeadsService.ingestLead via ContactIdentifierService), which also writes
-- contact_identifiers and contact_source channel/detail. The trigger was a
-- redundant double-write; the overlap window is idempotent because both paths
-- resolve to the same contact.
-- IMPORTANT: deploy only together with (or after) the apps/api release that
-- contains the identifier-service ingestLead path.

DO $$
DECLARE trig record;
BEGIN
  FOR trig IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.leads'::regclass
      AND NOT tgisinternal
      AND tgfoid = 'public.sync_lead_to_contact()'::regprocedure
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.leads', trig.tgname);
  END LOOP;
EXCEPTION
  WHEN undefined_function THEN
    NULL; -- function never existed in this environment (e.g. local/dev)
  WHEN undefined_table THEN
    NULL;
END $$;

DROP FUNCTION IF EXISTS public.sync_lead_to_contact();
