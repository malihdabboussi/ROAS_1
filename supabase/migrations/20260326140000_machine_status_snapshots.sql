CREATE TABLE IF NOT EXISTS machine_status_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_machines INT NOT NULL DEFAULT 0,
  running INT NOT NULL DEFAULT 0,
  suspended INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  none_status INT NOT NULL DEFAULT 0,
  always_on INT NOT NULL DEFAULT 0,
  estimated_hourly_cost NUMERIC(10,4) NOT NULL DEFAULT 0
);

CREATE INDEX idx_machine_snapshots_at ON machine_status_snapshots (snapshot_at DESC);

ALTER TABLE machine_status_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on machine_status_snapshots"
  ON machine_status_snapshots
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
