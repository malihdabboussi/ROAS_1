-- Match FREE_BASE_CREDITS in credits services (5k universal base for free + paid stack).
UPDATE subscription_plans SET base_credits = 5000 WHERE slug = 'free';
