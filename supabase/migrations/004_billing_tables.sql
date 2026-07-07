-- ============================================================
-- BILLING TABLES (Migration 004)
-- Credit-based billing with Stripe integration
-- ============================================================

-- Ensure trigger function exists in public schema
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. SUBSCRIPTION PLANS (static reference data)
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  stripe_price_id TEXT,
  price_amount INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  base_credits INTEGER NOT NULL DEFAULT 0,
  rollover_cap INTEGER NOT NULL DEFAULT 0,
  can_buy_credits BOOLEAN DEFAULT false,
  max_campaigns INTEGER,
  max_published_funnels INTEGER,
  max_custom_domains INTEGER DEFAULT 0,
  max_lead_magnets INTEGER,
  max_offers INTEGER,
  max_sequences INTEGER DEFAULT 0,
  max_brain_entries INTEGER,
  max_storage_bytes BIGINT,
  max_custom_themes INTEGER DEFAULT 1,
  can_voice_input BOOLEAN DEFAULT false,
  can_image_gen BOOLEAN DEFAULT false,
  can_advanced_analytics BOOLEAN DEFAULT false,
  can_api_access BOOLEAN DEFAULT false,
  can_white_label BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. USER SUBSCRIPTIONS
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  discount_percent INTEGER,
  discount_stripe_coupon_id TEXT,
  discount_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. USER TRIALS
CREATE TABLE user_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_type TEXT NOT NULL DEFAULT 'free' CHECK (trial_type IN ('free', 'paid')),
  trial_start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_end_date TIMESTAMPTZ NOT NULL,
  payment_status TEXT,
  stripe_payment_intent_id TEXT,
  payment_amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 4. MONTHLY CREDIT USAGE (per user, per month)
CREATE TABLE monthly_credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  base_allowance INTEGER NOT NULL DEFAULT 0,
  base_credits_used INTEGER NOT NULL DEFAULT 0,
  purchased_credits_used INTEGER NOT NULL DEFAULT 0,
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  total_credits_purchased INTEGER NOT NULL DEFAULT 0,
  rollover_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);

-- 5. CREDIT PURCHASES (one-time top-ups)
CREATE TABLE credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_purchased INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'pending')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. AI USAGE EVENTS (every API call logged)
CREATE TABLE ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  conversation_id UUID,
  feature TEXT NOT NULL,
  action TEXT,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  service_type TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  computed_cost DECIMAL(10,6),
  credits_charged INTEGER NOT NULL DEFAULT 0,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TOKEN PROVIDER PRICING (reference table)
CREATE TABLE token_providers_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  cost_per_unit DECIMAL(10,6) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, model_name, unit_type)
);

-- 8. CREDIT PACKS (reference table for top-up options)
CREATE TABLE credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL,
  price_amount INTEGER NOT NULL,
  stripe_price_id TEXT,
  bonus_percent INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_sub ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_stripe_cust ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_trials_user_id ON user_trials(user_id);
CREATE INDEX idx_monthly_credit_usage_user_month ON monthly_credit_usage(user_id, month);
CREATE INDEX idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX idx_ai_usage_events_user_id ON ai_usage_events(user_id);
CREATE INDEX idx_ai_usage_events_user_created ON ai_usage_events(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_events_feature ON ai_usage_events(feature);
CREATE INDEX idx_ai_usage_events_campaign ON ai_usage_events(campaign_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_providers_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY "service_role_full" ON subscription_plans FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON user_subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON user_trials FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON monthly_credit_usage FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON credit_purchases FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON ai_usage_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON token_providers_pricing FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON credit_packs FOR ALL USING (auth.role() = 'service_role');

-- Users: read own data
CREATE POLICY "users_read_own" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own" ON user_trials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own" ON monthly_credit_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own" ON credit_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_read_own" ON ai_usage_events FOR SELECT USING (auth.uid() = user_id);

-- Public: read plans and packs
CREATE POLICY "public_read" ON subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "public_read" ON credit_packs FOR SELECT USING (is_active = true);
CREATE POLICY "public_read" ON token_providers_pricing FOR SELECT USING (is_active = true);

-- Updated_at triggers
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_credit_usage_updated_at BEFORE UPDATE ON monthly_credit_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_token_providers_pricing_updated_at BEFORE UPDATE ON token_providers_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Plans
INSERT INTO subscription_plans (name, slug, interval, price_amount, base_credits, rollover_cap, can_buy_credits, max_campaigns, max_published_funnels, max_custom_domains, max_lead_magnets, max_offers, max_sequences, max_brain_entries, max_storage_bytes, max_custom_themes, can_voice_input, can_image_gen, can_advanced_analytics, can_api_access, can_white_label) VALUES
('Free',     'free',             'month', 0,      3000, 0,     false, 1,    1,    0,  3,    3,    0,    100,   536870912,    1,    false, false, false, false, false),
('Starter',  'starter-monthly',  'month', 2000,   4000,  2000,  true,  5,    3,    1,  10,   10,   3,    1000,  5368709120,   3,    true,  true,  false, false, false),
('Starter',  'starter-annual',   'year',  19200,  4000,  2000,  true,  5,    3,    1,  10,   10,   3,    1000,  5368709120,   3,    true,  true,  false, false, false),
('Pro',      'pro-monthly',      'month', 4000,   8000,  4000,  true,  NULL, 10,   5,  NULL, NULL, NULL, 10000, 26843545600,  10,   true,  true,  true,  false, false),
('Pro',      'pro-annual',       'year',  38400,  8000,  4000,  true,  NULL, 10,   5,  NULL, NULL, NULL, 10000, 26843545600,  10,   true,  true,  true,  false, false),
('Business', 'business-monthly', 'month', 20000,  40000, 20000, true,  NULL, NULL, NULL, NULL, NULL, NULL, NULL, 107374182400, NULL, true,  true,  true,  true,  true),
('Business', 'business-annual',  'year',  192000, 40000, 20000, true,  NULL, NULL, NULL, NULL, NULL, NULL, NULL, 107374182400, NULL, true,  true,  true,  true,  true);

-- Credit Packs
INSERT INTO credit_packs (name, slug, credits, price_amount, bonus_percent, sort_order) VALUES
('Small',  'pack-small',  1000,  500,   0,  1),
('Medium', 'pack-medium', 2200,  1000,  10, 2),
('Large',  'pack-large',  5000,  2000,  25, 3),
('XL',     'pack-xl',     12000, 4000,  50, 4);

-- Provider Pricing (current rates)
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, notes) VALUES
('anthropic', 'claude-opus-4-6',              'input_tokens_1k',  0.005000, '$5/MTok'),
('anthropic', 'claude-opus-4-6',              'output_tokens_1k', 0.025000, '$25/MTok'),
('anthropic', 'claude-opus-4-6',              'cache_read_1k',    0.000500, '$0.50/MTok cache read'),
('anthropic', 'claude-opus-4-6',              'cache_write_1k',   0.006250, '$6.25/MTok cache write'),
('anthropic', 'claude-sonnet-4-5',            'input_tokens_1k',  0.003000, '$3/MTok'),
('anthropic', 'claude-sonnet-4-5',            'output_tokens_1k', 0.015000, '$15/MTok'),
('anthropic', 'claude-sonnet-4-5',            'cache_read_1k',    0.000300, '$0.30/MTok cache read'),
('anthropic', 'claude-sonnet-4-5',            'cache_write_1k',   0.003750, '$3.75/MTok cache write'),
('anthropic', 'claude-haiku-4-5',             'input_tokens_1k',  0.001000, '$1/MTok'),
('anthropic', 'claude-haiku-4-5',             'output_tokens_1k', 0.005000, '$5/MTok'),
('anthropic', 'claude-haiku-4-5',             'cache_read_1k',    0.000100, '$0.10/MTok cache read'),
('anthropic', 'claude-haiku-4-5',             'cache_write_1k',   0.001250, '$1.25/MTok cache write'),
('google',    'imagen-4.0-generate-001',      'images_1',         0.040000, '$0.04/image'),
('google',    'imagen-4.0-fast-generate-001', 'images_1',         0.020000, '$0.02/image fast'),
('deepgram',  'nova-2',                       'audio_minutes',    0.004300, '$0.0043/min');
