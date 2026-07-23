-- Programs table was created with RLS but without role GRANTs.
-- authenticated/service_role need CRUD so Nest user-scoped clients can list/seed.

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.programs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.programs TO service_role;

COMMIT;
