-- ============================================================
-- ENTERPRISE ROLE
-- Adds 'enterprise' to user_profiles.role, expands promo_codes.grants_role,
-- adds credit_discount_percent to user_profiles, and seeds enterprise promo code.
-- ============================================================

-- 1. Expand user_profiles.role CHECK to include 'enterprise'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('user', 'power', 'admin', 'enterprise'));

-- 2. Expand promo_codes.grants_role CHECK to include 'enterprise'
ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_grants_role_check;
ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_grants_role_check
  CHECK (grants_role IN ('user', 'power', 'admin', 'enterprise'));

-- 3. Add credit_discount_percent to user_profiles (enterprise = 20)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS credit_discount_percent INTEGER NOT NULL DEFAULT 0;

-- 4. Seed an example enterprise promo code
INSERT INTO promo_codes (code, description, credits_amount, grants_role, max_redemptions, is_active)
VALUES ('ENTERPRISE-BRIAN', 'Enterprise access for Brian — 10K credits + enterprise role', 10000, 'enterprise', 1, true)
ON CONFLICT (code) DO NOTHING;
