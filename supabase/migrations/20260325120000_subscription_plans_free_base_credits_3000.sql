-- Reduce free plan base credits from 5k to 3k per month.
UPDATE subscription_plans SET base_credits = 3000 WHERE slug = 'free';
