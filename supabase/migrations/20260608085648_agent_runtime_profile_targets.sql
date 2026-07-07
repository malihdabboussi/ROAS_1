ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_runtime_type TEXT NOT NULL DEFAULT 'fly_machine',
  ADD COLUMN IF NOT EXISTS agent_runtime_url TEXT,
  ADD COLUMN IF NOT EXISTS agent_runtime_type_staging TEXT NOT NULL DEFAULT 'fly_machine',
  ADD COLUMN IF NOT EXISTS agent_runtime_url_staging TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_agent_runtime_type_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agent_runtime_type_check
      CHECK (agent_runtime_type IN ('fly_machine', 'shared_railway'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_agent_runtime_url_required_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agent_runtime_url_required_check
      CHECK (
        agent_runtime_type <> 'shared_railway'
        OR NULLIF(BTRIM(agent_runtime_url), '') IS NOT NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_agent_runtime_type_staging_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agent_runtime_type_staging_check
      CHECK (agent_runtime_type_staging IN ('fly_machine', 'shared_railway'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_agent_runtime_url_staging_required_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agent_runtime_url_staging_required_check
      CHECK (
        agent_runtime_type_staging <> 'shared_railway'
        OR NULLIF(BTRIM(agent_runtime_url_staging), '') IS NOT NULL
      );
  END IF;
END $$;
