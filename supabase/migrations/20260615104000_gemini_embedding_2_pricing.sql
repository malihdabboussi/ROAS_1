-- Gemini Embedding 2 GA: ~$0.20 / 1M tokens → $0.00020 per 1k tokens (input).
-- Output tokens typically zero for embedContent; row included so runtime token math never falls back to unrelated defaults.
INSERT INTO token_providers_pricing (
  provider,
  model_name,
  unit_type,
  cost_per_unit,
  is_active,
  service_type,
  currency,
  context_window_tokens,
  max_output_tokens
) VALUES
  ('google', 'gemini-embedding-2', 'input_tokens_1k', 0.000200, true, 'llm', 'USD', 8192, 1),
  ('google', 'gemini-embedding-2', 'output_tokens_1k', 0.000200, true, 'llm', 'USD', 8192, 1),
  ('google', 'gemini-embedding-2', 'cache_read_1k', 0.000067, true, 'llm', 'USD', 8192, 1),
  ('google', 'gemini-embedding-2', 'cache_write_1k', 0.000200, true, 'llm', 'USD', 8192, 1)
ON CONFLICT (provider, model_name, unit_type) DO UPDATE SET
  cost_per_unit = EXCLUDED.cost_per_unit,
  is_active = EXCLUDED.is_active,
  service_type = EXCLUDED.service_type,
  currency = EXCLUDED.currency,
  context_window_tokens = EXCLUDED.context_window_tokens,
  max_output_tokens = EXCLUDED.max_output_tokens,
  updated_at = now();
