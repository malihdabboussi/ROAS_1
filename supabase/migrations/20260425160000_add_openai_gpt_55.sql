-- OpenAI GPT-5.5 (via OpenRouter)
-- Specs from OpenRouter: 1.05M context, 128K max output
-- Pricing: tiered ≤272K / >272K; using ≤272K tier as default (Input $5/1M, Output $30/1M, Cache read $0.50/1M)

INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('openai', 'gpt-5.5', 'input_tokens_1k', 0.005000, true, 'llm', 'USD', 1050000, 128000),
  ('openai', 'gpt-5.5', 'output_tokens_1k', 0.030000, true, 'llm', 'USD', 1050000, 128000),
  ('openai', 'gpt-5.5', 'cache_read_1k', 0.000500, true, 'llm', 'USD', 1050000, 128000);
