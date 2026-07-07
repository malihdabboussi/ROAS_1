insert into public.token_providers_pricing (
  provider,
  model_name,
  unit_type,
  cost_per_unit,
  is_active,
  notes,
  service_type,
  currency,
  context_window_tokens,
  max_output_tokens
)
values
  ('anthropic', 'claude-fable-5', 'input_tokens_1k', 0.010000, true, '$10/MTok input, OpenRouter verified', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-fable-5', 'output_tokens_1k', 0.050000, true, '$50/MTok output, OpenRouter verified', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-fable-5', 'cache_read_1k', 0.001000, true, '$1/MTok cache read, OpenRouter verified', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-fable-5', 'cache_write_1k', 0.012500, true, '$12.50/MTok cache write, OpenRouter verified', 'llm', 'USD', 1000000, 128000)
on conflict (provider, model_name, unit_type) do update
set cost_per_unit = excluded.cost_per_unit,
    is_active = excluded.is_active,
    notes = excluded.notes,
    service_type = excluded.service_type,
    currency = excluded.currency,
    context_window_tokens = excluded.context_window_tokens,
    max_output_tokens = excluded.max_output_tokens,
    updated_at = now();

insert into public.llm_model_capabilities (
  provider,
  model_name,
  display_name,
  is_active,
  is_selectable,
  source,
  context_window_tokens,
  max_output_tokens,
  input_modalities,
  output_modalities,
  supported_parameters,
  supports_images,
  capability_profile,
  raw_openrouter,
  synced_at
)
values
  ('anthropic', 'claude-fable-5', 'Claude Fable 5', true, true, 'openrouter_verified', 1000000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_tokens','reasoning','response_format','stop','structured_outputs','tool_choice','tools','verbosity'], true, '{"reasoning":{"transport":"verbosity","levels":["low","medium","high","xhigh","max"]},"context":{"tiers":[{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]},"speed":{"available":false}}'::jsonb, '{"id":"anthropic/claude-fable-5","name":"Anthropic: Claude Fable 5"}'::jsonb, now())
on conflict (provider, model_name) do update
set display_name = excluded.display_name,
    is_active = excluded.is_active,
    is_selectable = excluded.is_selectable,
    source = excluded.source,
    context_window_tokens = excluded.context_window_tokens,
    max_output_tokens = excluded.max_output_tokens,
    input_modalities = excluded.input_modalities,
    output_modalities = excluded.output_modalities,
    supported_parameters = excluded.supported_parameters,
    supports_images = excluded.supports_images,
    capability_profile = excluded.capability_profile,
    raw_openrouter = excluded.raw_openrouter,
    synced_at = excluded.synced_at,
    updated_at = now();
