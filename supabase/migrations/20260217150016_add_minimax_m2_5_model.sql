INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens)
VALUES
  ('minimax', 'minimax-m2.5', 'input_tokens_1k', 0.0003, true, 'llm', 'USD', 200000, 8192),
  ('minimax', 'minimax-m2.5', 'output_tokens_1k', 0.0012, true, 'llm', 'USD', 200000, 8192);;
