-- Update campaign caps across active plans.
-- Scope: non-archived campaign count.

UPDATE subscription_plans
SET max_campaigns = CASE slug
  WHEN 'free' THEN 1
  WHEN 'basic-monthly' THEN 1
  WHEN 'basic-annual' THEN 1
  WHEN 'pro-monthly' THEN 2
  WHEN 'pro-annual' THEN 2
  WHEN 'pro-12k-monthly' THEN 2
  WHEN 'pro-12k-annual' THEN 2
  WHEN 'pro-16k-monthly' THEN 3
  WHEN 'pro-16k-annual' THEN 3
  WHEN 'pro-20k-monthly' THEN 4
  WHEN 'pro-20k-annual' THEN 4
  WHEN 'pro-40k-monthly' THEN 6
  WHEN 'pro-40k-annual' THEN 6
  WHEN 'pro-63k-monthly' THEN 9
  WHEN 'pro-63k-annual' THEN 9
  WHEN 'pro-85k-monthly' THEN 12
  WHEN 'pro-85k-annual' THEN 12
  WHEN 'pro-110k-monthly' THEN 15
  WHEN 'pro-110k-annual' THEN 15
  WHEN 'ultra-monthly' THEN 6
  WHEN 'ultra-annual' THEN 6
  ELSE max_campaigns
END
WHERE slug IN (
  'free',
  'basic-monthly',
  'basic-annual',
  'pro-monthly',
  'pro-annual',
  'pro-12k-monthly',
  'pro-12k-annual',
  'pro-16k-monthly',
  'pro-16k-annual',
  'pro-20k-monthly',
  'pro-20k-annual',
  'pro-40k-monthly',
  'pro-40k-annual',
  'pro-63k-monthly',
  'pro-63k-annual',
  'pro-85k-monthly',
  'pro-85k-annual',
  'pro-110k-monthly',
  'pro-110k-annual',
  'ultra-monthly',
  'ultra-annual'
);
