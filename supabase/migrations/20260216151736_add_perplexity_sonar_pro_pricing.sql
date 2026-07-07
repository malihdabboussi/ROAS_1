
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('perplexity', 'sonar-pro', 'input_tokens_1k', 0.003000, true, 'llm', 'USD', 127072, 4096),
  ('perplexity', 'sonar-pro', 'output_tokens_1k', 0.015000, true, 'llm', 'USD', 127072, 4096);
;
