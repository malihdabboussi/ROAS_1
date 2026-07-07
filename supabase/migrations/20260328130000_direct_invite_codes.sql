-- Generic invite codes for bypassing the waitlist (not email-bound)

CREATE TABLE direct_invite_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  label       TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_uses    INT DEFAULT NULL,
  uses_count  INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ DEFAULT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE direct_invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON direct_invite_codes FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_direct_invite_codes_code ON direct_invite_codes(code);
CREATE INDEX idx_direct_invite_codes_active ON direct_invite_codes(is_active) WHERE is_active = true;
