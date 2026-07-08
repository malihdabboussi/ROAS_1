-- ROAS production bootstrap: extensions + public wrappers for legacy migrations.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$ SELECT extensions.uuid_generate_v4() $$;

CREATE OR REPLACE FUNCTION public.uuid_generate_v1()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$ SELECT extensions.uuid_generate_v1() $$;
