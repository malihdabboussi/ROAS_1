-- Deactivate gemini-3.1-flash-lite-preview, activate gemini-3-flash-preview
UPDATE token_providers_pricing
SET is_active = false
WHERE provider = 'google' AND model_name = 'gemini-3.1-flash-lite-preview';

UPDATE token_providers_pricing
SET is_active = true
WHERE provider = 'google' AND model_name = 'gemini-3-flash-preview';
