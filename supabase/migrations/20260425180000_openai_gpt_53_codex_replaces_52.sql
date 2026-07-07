-- OpenAI GPT-5.3 Codex via OpenRouter (replaces gpt-5.2-codex in product)
-- OpenRouter: 400K context, 128K max output; $1.75/M in, $14/M out, $0.175/M cache (same per-1K as 5.2)

INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, is_active, service_type, currency, context_window_tokens, max_output_tokens) VALUES
  ('openai', 'gpt-5.3-codex', 'input_tokens_1k', 0.001750, true, 'llm', 'USD', 400000, 128000),
  ('openai', 'gpt-5.3-codex', 'output_tokens_1k', 0.014000, true, 'llm', 'USD', 400000, 128000),
  ('openai', 'gpt-5.3-codex', 'cache_read_1k', 0.000175, true, 'llm', 'USD', 400000, 128000);

UPDATE token_providers_pricing
SET is_active = false, updated_at = now()
WHERE provider = 'openai' AND model_name = 'gpt-5.2-codex';

UPDATE public.conversations
SET default_model_id = 'openai/gpt-5.3-codex'
WHERE default_model_id = 'openai/gpt-5.2-codex';

UPDATE public.agents_registry
SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{model_id}', '"openai/gpt-5.3-codex"', true)
WHERE config->>'model_id' = 'openai/gpt-5.2-codex';
