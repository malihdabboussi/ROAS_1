ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_machine_id_staging TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_machine_url_staging TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_machine_status_staging TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_runtime_app_staging TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_runtime_status_staging TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_runtime_last_activity_at_staging TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_runtime_idle_staging
  ON profiles (fly_runtime_status_staging, fly_runtime_last_activity_at_staging)
  WHERE fly_runtime_status_staging = 'running';

DROP FUNCTION IF EXISTS acquire_provision_lock(UUID);

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
    ELSE 'vibey-runtimes'
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

DROP FUNCTION IF EXISTS get_machine_status_counts();

CREATE OR REPLACE FUNCTION get_machine_status_counts(p_environment TEXT DEFAULT 'production')
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
STABLE
AS $$
DECLARE
  env TEXT := CASE
    WHEN lower(COALESCE(p_environment, 'production')) = 'staging' THEN 'staging'
    ELSE 'production'
  END;
BEGIN
  IF env = 'staging' THEN
    RETURN QUERY
    SELECT
      COALESCE(fly_runtime_status_staging, 'none') AS status,
      COUNT(*)::BIGINT AS count
    FROM profiles
    WHERE fly_machine_id_staging IS NOT NULL
    GROUP BY COALESCE(fly_runtime_status_staging, 'none');
  ELSE
    RETURN QUERY
    SELECT
      COALESCE(fly_runtime_status, 'none') AS status,
      COUNT(*)::BIGINT AS count
    FROM profiles
    WHERE fly_machine_id IS NOT NULL
    GROUP BY COALESCE(fly_runtime_status, 'none');
  END IF;
END;
$$;
