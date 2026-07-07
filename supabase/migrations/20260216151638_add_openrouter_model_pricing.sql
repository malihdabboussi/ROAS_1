
-- Claude Opus 4.5 (via OpenRouter)
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('anthropic', 'claude-opus-4-5', 'input_tokens_1k', 0.005000, true, 'llm', 'USD', 200000, 8192),
  ('anthropic', 'claude-opus-4-5', 'output_tokens_1k', 0.025000, true, 'llm', 'USD', 200000, 8192),
  ('anthropic', 'claude-opus-4-5', 'cache_read_1k', 0.000500, true, 'llm', 'USD', 200000, 8192),
  ('anthropic', 'claude-opus-4-5', 'cache_write_1k', 0.006250, true, 'llm', 'USD', 200000, 8192);

-- Google Gemini 3 Pro Preview (via OpenRouter)
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('google', 'gemini-3-pro-preview', 'input_tokens_1k', 0.002000, true, 'llm', 'USD', 1000000, 8192),
  ('google', 'gemini-3-pro-preview', 'output_tokens_1k', 0.012000, true, 'llm', 'USD', 1000000, 8192),
  ('google', 'gemini-3-pro-preview', 'cache_read_1k', 0.000200, true, 'llm', 'USD', 1000000, 8192);

-- Google Gemini 3 Flash Preview (via OpenRouter)
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('google', 'gemini-3-flash-preview', 'input_tokens_1k', 0.000500, true, 'llm', 'USD', 1000000, 8192),
  ('google', 'gemini-3-flash-preview', 'output_tokens_1k', 0.003000, true, 'llm', 'USD', 1000000, 8192),
  ('google', 'gemini-3-flash-preview', 'cache_read_1k', 0.000050, true, 'llm', 'USD', 1000000, 8192);

-- OpenAI GPT-5.2 Chat (via OpenRouter)
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('openai', 'gpt-5.2-chat', 'input_tokens_1k', 0.001750, true, 'llm', 'USD', 128000, 128000),
  ('openai', 'gpt-5.2-chat', 'output_tokens_1k', 0.014000, true, 'llm', 'USD', 128000, 128000);

-- OpenAI GPT-5.2 Codex (via OpenRouter)
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('openai', 'gpt-5.2-codex', 'input_tokens_1k', 0.001750, true, 'llm', 'USD', 272000, 128000),
  ('openai', 'gpt-5.2-codex', 'output_tokens_1k', 0.014000, true, 'llm', 'USD', 272000, 128000),
  ('openai', 'gpt-5.2-codex', 'cache_read_1k', 0.000175, true, 'llm', 'USD', 272000, 128000);

-- Z-AI GLM-5 (via OpenRouter)
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('z-ai', 'glm-5', 'input_tokens_1k', 0.001000, true, 'llm', 'USD', 200000, 128000),
  ('z-ai', 'glm-5', 'output_tokens_1k', 0.003200, true, 'llm', 'USD', 200000, 128000);
;
