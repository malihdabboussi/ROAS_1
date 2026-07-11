-- ROAS production: route agent runtime away from Vibey Railway / vibey-runtimes defaults.

ALTER TABLE public.profiles
  ALTER COLUMN agent_runtime_url SET DEFAULT 'https://roas-runtimes.fly.dev';

UPDATE public.profiles
SET
  agent_runtime_url = 'https://roas-runtimes.fly.dev',
  updated_at = now()
WHERE agent_runtime_type = 'shared_railway'
  AND (
    agent_runtime_url IS NULL
    OR agent_runtime_url ILIKE '%vibeyv2-production%'
    OR agent_runtime_url ILIKE '%.up.railway.app%'
  );

UPDATE public.profiles
SET
  fly_runtime_app = 'roas-runtimes',
  updated_at = now()
WHERE fly_runtime_app IS NULL
   OR fly_runtime_app = 'vibey-runtimes';

ALTER TABLE public.machine_pool
  ALTER COLUMN fly_app SET DEFAULT 'roas-runtimes';

UPDATE public.machine_pool
SET
  fly_app = 'roas-runtimes',
  updated_at = now()
WHERE fly_app = 'vibey-runtimes'
  AND state IN ('provisioning', 'ready');

DROP FUNCTION IF EXISTS acquire_provision_lock(UUID, TEXT);

CREATE OR REPLACE FUNCTION acquire_provision_lock(
  p_user_id UUID,
  p_environment TEXT DEFAULT 'production'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  env TEXT := CASE
    WHEN lower(COALESCE(p_environment, 'production')) = 'staging' THEN 'staging'
    ELSE 'production'
  END;
  default_runtime_app TEXT := CASE
    WHEN env = 'staging' THEN 'vibey-runtimes-staging'
    ELSE 'roas-runtimes'
  END;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'unauthorized');
  END IF;

  SELECT
    CASE WHEN env = 'staging' THEN fly_machine_id_staging ELSE fly_machine_id END AS machine_id,
    CASE WHEN env = 'staging' THEN fly_machine_url_staging ELSE fly_machine_url END AS machine_url,
    CASE WHEN env = 'staging' THEN fly_machine_status_staging ELSE fly_machine_status END AS machine_status,
    CASE WHEN env = 'staging' THEN fly_runtime_app_staging ELSE fly_runtime_app END AS runtime_app,
    CASE WHEN env = 'staging' THEN fly_runtime_status_staging ELSE fly_runtime_status END AS runtime_status,
    updated_at
  INTO r
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'profile_not_found');
  END IF;

  IF r.machine_status = 'running' AND r.machine_url IS NOT NULL THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'status', 'running',
      'machine_id', r.machine_id,
      'machine_url', r.machine_url,
      'fly_runtime_app', COALESCE(r.runtime_app, default_runtime_app)
    );
  END IF;

  IF r.machine_status = 'provisioning' AND r.updated_at > now() - interval '2 minutes' THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'status', 'provisioning',
      'fly_runtime_app', COALESCE(r.runtime_app, default_runtime_app)
    );
  END IF;

  IF env = 'staging' THEN
    UPDATE profiles
    SET
      fly_machine_status_staging = 'provisioning',
      fly_runtime_status_staging = 'provisioning',
      updated_at = now()
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET
      fly_machine_status = 'provisioning',
      fly_runtime_status = 'provisioning',
      updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'acquired', true,
    'fly_runtime_app', COALESCE(r.runtime_app, default_runtime_app)
  );
END;
$$;
