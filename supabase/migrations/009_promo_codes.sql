-- ============================================================
-- PROMO CODES SYSTEM (Migration 009)
-- Allows creating promotional codes that grant credits on signup
-- ============================================================

-- 1. PROMO CODES (admin-managed promotional codes)
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  credits_amount INTEGER NOT NULL,
  max_redemptions INTEGER,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROMO REDEMPTIONS (tracks who redeemed which code)
CREATE TABLE promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_granted INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(promo_code_id, user_id)
);

-- INDEXES
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_redemptions_user ON promo_redemptions(user_id);
CREATE INDEX idx_promo_redemptions_code ON promo_redemptions(promo_code_id);

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY "service_role_full" ON promo_codes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON promo_redemptions FOR ALL USING (auth.role() = 'service_role');

-- Users: read own redemptions
CREATE POLICY "users_read_own" ON promo_redemptions FOR SELECT USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED: Insert LAUNCH200K promo code with 200,000 credits
-- ============================================================
INSERT INTO promo_codes (code, description, credits_amount, max_redemptions, is_active)
VALUES ('POWERUSER', 'Power user promo — 200K credits for new signups', 200000, NULL, true);
