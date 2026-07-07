-- Auto recharge settings per user.
-- Keeps pricing fixed at $1 = 200 credits and enforces a $10 minimum top-up.

CREATE TABLE user_credit_auto_recharge (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  trigger_credits INTEGER NOT NULL DEFAULT 500 CHECK (trigger_credits >= 0),
  topup_credits INTEGER NOT NULL DEFAULT 2000 CHECK (topup_credits >= 2000 AND topup_credits % 200 = 0),
  last_recharged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_credit_auto_recharge_enabled
  ON user_credit_auto_recharge (is_enabled)
  WHERE is_enabled = true;

ALTER TABLE user_credit_auto_recharge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full" ON user_credit_auto_recharge
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "users_read_own" ON user_credit_auto_recharge
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON user_credit_auto_recharge
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON user_credit_auto_recharge
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_credit_auto_recharge_updated_at
  BEFORE UPDATE ON user_credit_auto_recharge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
