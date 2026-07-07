
-- Add columns from V1 that V2 is missing
ALTER TABLE token_providers_pricing
  ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'llm',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS context_window_tokens integer,
  ADD COLUMN IF NOT EXISTS max_output_tokens integer;

-- Backfill existing rows
UPDATE token_providers_pricing SET service_type = 'llm', currency = 'USD' WHERE provider = 'anthropic';
UPDATE token_providers_pricing SET service_type = 'speech-to-text', currency = 'USD' WHERE provider = 'deepgram';
UPDATE token_providers_pricing SET service_type = 'image-generation', currency = 'USD' WHERE provider = 'google' AND unit_type = 'images_1';

-- Set context windows for existing Anthropic models
UPDATE token_providers_pricing SET context_window_tokens = 200000, max_output_tokens = 8192 WHERE model_name = 'claude-sonnet-4-5';
UPDATE token_providers_pricing SET context_window_tokens = 200000, max_output_tokens = 8192 WHERE model_name = 'claude-opus-4-6';
UPDATE token_providers_pricing SET context_window_tokens = 200000, max_output_tokens = 8192 WHERE model_name = 'claude-haiku-4-5';
;
