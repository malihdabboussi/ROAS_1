-- OpenAI GPT-5.4 Image 2 via OpenRouter
-- OpenRouter: 272K context, 128K max output
-- Token-based pricing: Input $8/M, Output $15/M, Cache Read $2/M, Image Output $30/M
-- Billing: token-based (input_tokens_1k + output_tokens_1k + cache_read_1k + image_output_tokens_1k)

INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('openai', 'gpt-5.4-image-2', 'input_tokens_1k', 0.008000, true, 'image-generation', 'USD', 272000, 128000),
  ('openai', 'gpt-5.4-image-2', 'output_tokens_1k', 0.015000, true, 'image-generation', 'USD', 272000, 128000),
  ('openai', 'gpt-5.4-image-2', 'cache_read_1k', 0.002000, true, 'image-generation', 'USD', 272000, 128000),
  ('openai', 'gpt-5.4-image-2', 'image_output_tokens_1k', 0.030000, true, 'image-generation', 'USD', 272000, 128000);

INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('google', 'gemini-3.1-flash-image-preview', 'images_1', 0.030000, true, 'image-generation', 'USD', null, null)
ON CONFLICT (provider, model_name, unit_type) DO NOTHING;
