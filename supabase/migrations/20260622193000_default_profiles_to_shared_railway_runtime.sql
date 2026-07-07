ALTER TABLE public.profiles
  ALTER COLUMN agent_runtime_type SET DEFAULT 'shared_railway',
  ALTER COLUMN agent_runtime_url SET DEFAULT 'https://vibeyv2-production-1437.up.railway.app';
