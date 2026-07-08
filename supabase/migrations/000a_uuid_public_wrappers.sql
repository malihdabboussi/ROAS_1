-- Supabase stores uuid-ossp in extensions schema; legacy migrations call public.uuid_generate_v4().
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
