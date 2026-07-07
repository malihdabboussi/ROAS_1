-- DeepSeek V4 Flash via OpenRouter
-- OpenRouter: ~1M context, 131K max output; $0.14/M in, $0.28/M out, $0.02/M cache read.
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('deepseek', 'deepseek-v4-flash', 'input_tokens_1k', 0.000140, true, 'llm', 'USD', 1048576, 131072),
  ('deepseek', 'deepseek-v4-flash', 'output_tokens_1k', 0.000280, true, 'llm', 'USD', 1048576, 131072),
  ('deepseek', 'deepseek-v4-flash', 'cache_read_1k', 0.000020, true, 'llm', 'USD', 1048576, 131072)
ON CONFLICT (provider, model_name, unit_type) DO UPDATE SET
  cost_per_unit = EXCLUDED.cost_per_unit,
  is_active = EXCLUDED.is_active,
  service_type = EXCLUDED.service_type,
  currency = EXCLUDED.currency,
  context_window_tokens = EXCLUDED.context_window_tokens,
  max_output_tokens = EXCLUDED.max_output_tokens,
  updated_at = now();
