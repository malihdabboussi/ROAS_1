-- Fast-track purchases: holds Stripe data between payment and account creation
-- for users who pay Ultra $200/mo to skip the waitlist.

CREATE TABLE fast_track_purchases (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                      TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_customer_id         TEXT,
  stripe_subscription_id     TEXT,
  invite_code_id             UUID REFERENCES direct_invite_codes(id),
  invite_code                TEXT,
  redeemed_user_id           UUID REFERENCES auth.users(id),
  status                     TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'paid', 'redeemed', 'failed')),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fast_track_purchases_email ON fast_track_purchases(email);
CREATE INDEX idx_fast_track_purchases_status ON fast_track_purchases(status);
CREATE INDEX idx_fast_track_purchases_session ON fast_track_purchases(stripe_checkout_session_id);

ALTER TABLE fast_track_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON fast_track_purchases FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_fast_track_purchases_updated_at
  BEFORE UPDATE ON fast_track_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
