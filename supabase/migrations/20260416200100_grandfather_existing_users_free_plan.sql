-- Grandfathering: give all existing users an active free subscription row
-- so the paywall check (status IN ('active','trialing')) passes for them.
INSERT INTO user_subscriptions (user_id, plan_id, status, stripe_subscription_id)
SELECT
  au.id,
  sp.id,
  'active',
  NULL
FROM auth.users au
CROSS JOIN (SELECT id FROM subscription_plans WHERE slug = 'free' LIMIT 1) sp
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = au.id
);
