-- Atomic provision lock: prevents double provision race when auth callback + MachineProvisionGate both call provision.
-- Uses FOR UPDATE to serialize concurrent requests per user.

CREATE OR REPLACE FUNCTION acquire_provision_lock(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Allow service_role (server-side) callers; regular users must match auth.uid()
  IF auth.role() IS DISTINCT FROM 'service_role' AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'unauthorized');
  END IF;

  -- Lock the row for this transaction (blocks concurrent provision attempts)
  SELECT fly_machine_id, fly_machine_url, fly_machine_status, fly_runtime_app, fly_runtime_status, updated_at
  INTO r
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'profile_not_found');
  END IF;

  -- Already running with URL → no need to provision
  IF r.fly_machine_status = 'running' AND r.fly_machine_url IS NOT NULL THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'status', 'running',
      'machine_id', r.fly_machine_id,
      'machine_url', r.fly_machine_url,
      'fly_runtime_app', r.fly_runtime_app
    );
  END IF;

  -- Recently started provisioning by another request → skip
  IF r.fly_machine_status = 'provisioning' AND r.updated_at > now() - interval '2 minutes' THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'status', 'provisioning',
      'fly_runtime_app', r.fly_runtime_app
    );
  END IF;

  -- Acquire lock: set provisioning status
  UPDATE profiles
  SET fly_machine_status = 'provisioning', fly_runtime_status = 'provisioning', updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'acquired', true,
    'fly_runtime_app', COALESCE(r.fly_runtime_app, 'vibey-runtimes')
  );
END;
$$;
