-- Warm pool of pre-stopped Fly.io machines, unassigned and ready to be claimed on user payment.
-- State machine: provisioning -> ready -> claimed (terminal) OR failed (terminal)

CREATE TABLE machine_pool (
  machine_id TEXT PRIMARY KEY,
  fly_app TEXT NOT NULL DEFAULT 'vibey-runtimes',
  state TEXT NOT NULL CHECK (state IN ('provisioning', 'ready', 'claimed', 'failed')),
  claimed_by UUID REFERENCES auth.users(id),
  claimed_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_machine_pool_ready ON machine_pool(state, created_at) WHERE state = 'ready';
CREATE INDEX idx_machine_pool_provisioning ON machine_pool(state) WHERE state = 'provisioning';

ALTER TABLE machine_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON machine_pool FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_machine_pool_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER machine_pool_updated_at
BEFORE UPDATE ON machine_pool
FOR EACH ROW EXECUTE FUNCTION update_machine_pool_updated_at();

-- Atomic claim: picks oldest ready machine and marks it claimed in a single transaction.
-- Uses FOR UPDATE SKIP LOCKED so concurrent claims don't block each other.
CREATE OR REPLACE FUNCTION claim_pool_machine(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_machine_id TEXT;
  v_fly_app TEXT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'unauthorized');
  END IF;

  UPDATE machine_pool
  SET state = 'claimed', claimed_by = p_user_id, claimed_at = now()
  WHERE machine_id = (
    SELECT machine_id FROM machine_pool
    WHERE state = 'ready'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING machine_id, fly_app INTO v_machine_id, v_fly_app;

  IF v_machine_id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'pool_empty');
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'machine_id', v_machine_id,
    'fly_app', v_fly_app
  );
END;
$$;
