ALTER TABLE user_credit_auto_recharge
  ADD COLUMN monthly_cap_cents INTEGER DEFAULT NULL
    CHECK (monthly_cap_cents IS NULL OR monthly_cap_cents >= 1000);
