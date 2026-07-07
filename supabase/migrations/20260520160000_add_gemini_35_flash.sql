-- Add google/gemini-3.5-flash (OpenRouter) and retire gemini-3-flash-preview for user-facing LLM chat
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('google', 'gemini-3.5-flash', 'input_tokens_1k', 0.001500, true, 'llm', 'USD', 1050000, 65500),
  ('google', 'gemini-3.5-flash', 'output_tokens_1k', 0.009000, true, 'llm', 'USD', 1050000, 65500),
  ('google', 'gemini-3.5-flash', 'cache_read_1k', 0.000150, true, 'llm', 'USD', 1050000, 65500),
  ('google', 'gemini-3.5-flash', 'cache_write_1k', 0.000083, true, 'llm', 'USD', 1050000, 65500);

UPDATE token_providers_pricing
SET is_active = false
WHERE provider = 'google' AND model_name = 'gemini-3-flash-preview';
