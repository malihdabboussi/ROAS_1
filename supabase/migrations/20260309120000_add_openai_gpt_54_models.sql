-- OpenAI GPT-5.4 and GPT-5.4 Pro (via OpenRouter)
-- Specs from OpenRouter: 1.05M context, 128K max output
-- Pricing: tiered ≤272K / >272K; using ≤272K tier as default

-- GPT-5.4 Pro: Input $30/1M, Output $180/1M (≤272K tier)
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('openai', 'gpt-5.4-pro', 'input_tokens_1k', 0.030000, true, 'llm', 'USD', 1050000, 128000),
  ('openai', 'gpt-5.4-pro', 'output_tokens_1k', 0.180000, true, 'llm', 'USD', 1050000, 128000);

-- GPT-5.4: Input $2.50/1M, Output $15/1M, Cache Read $0.25/1M (≤272K tier)
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('openai', 'gpt-5.4', 'input_tokens_1k', 0.002500, true, 'llm', 'USD', 1050000, 128000),
  ('openai', 'gpt-5.4', 'output_tokens_1k', 0.015000, true, 'llm', 'USD', 1050000, 128000),
  ('openai', 'gpt-5.4', 'cache_read_1k', 0.000250, true, 'llm', 'USD', 1050000, 128000);
