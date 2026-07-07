-- Rename Starter → Basic
UPDATE subscription_plans SET name = 'Basic', slug = 'basic-monthly' WHERE slug = 'starter-monthly';
UPDATE subscription_plans SET name = 'Basic', slug = 'basic-annual' WHERE slug = 'starter-annual';

-- Rename Business → Ultra
UPDATE subscription_plans SET name = 'Ultra', slug = 'ultra-monthly' WHERE slug = 'business-monthly';
UPDATE subscription_plans SET name = 'Ultra', slug = 'ultra-annual' WHERE slug = 'business-annual';;
