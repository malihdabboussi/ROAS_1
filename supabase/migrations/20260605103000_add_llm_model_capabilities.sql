create table if not exists public.llm_model_capabilities (
  provider text not null,
  model_name text not null,
  display_name text not null,
  is_active boolean not null default true,
  is_selectable boolean not null default true,
  source text not null default 'openrouter',
  context_window_tokens integer not null,
  max_output_tokens integer,
  input_modalities text[] not null default array['text']::text[],
  output_modalities text[] not null default array['text']::text[],
  supported_parameters text[] not null default array[]::text[],
  supports_images boolean not null default false,
  capability_profile jsonb not null default '{}'::jsonb,
  raw_openrouter jsonb not null default '{}'::jsonb,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint llm_model_capabilities_pkey primary key (provider, model_name),
  constraint llm_model_capabilities_context_positive check (context_window_tokens > 0),
  constraint llm_model_capabilities_max_output_positive check (
    max_output_tokens is null or max_output_tokens > 0
  ),
  constraint llm_model_capabilities_profile_object check (jsonb_typeof(capability_profile) = 'object'),
  constraint llm_model_capabilities_raw_object check (jsonb_typeof(raw_openrouter) = 'object')
);

create index if not exists llm_model_capabilities_active_idx
  on public.llm_model_capabilities (is_active, is_selectable, provider, model_name);

alter table public.llm_model_capabilities enable row level security;

drop policy if exists "llm_model_capabilities_service_role_full" on public.llm_model_capabilities;
create policy "llm_model_capabilities_service_role_full"
  on public.llm_model_capabilities
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "llm_model_capabilities_public_read_active" on public.llm_model_capabilities;
create policy "llm_model_capabilities_public_read_active"
  on public.llm_model_capabilities
  for select
  to anon, authenticated
  using (is_active = true);

create or replace function public.touch_llm_model_capabilities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_llm_model_capabilities_updated_at
  on public.llm_model_capabilities;

create trigger touch_llm_model_capabilities_updated_at
  before update on public.llm_model_capabilities
  for each row
  execute function public.touch_llm_model_capabilities_updated_at();

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
  ('anthropic', 'claude-opus-4.6-fast', 'input_tokens_1k', 0.030000, true, '$30/MTok input, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.6-fast', 'output_tokens_1k', 0.150000, true, '$150/MTok output, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.6-fast', 'cache_read_1k', 0.003000, true, '$3/MTok cache read, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.6-fast', 'cache_write_1k', 0.037500, true, '$37.50/MTok cache write, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.7-fast', 'input_tokens_1k', 0.030000, true, '$30/MTok input, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.7-fast', 'output_tokens_1k', 0.150000, true, '$150/MTok output, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.7-fast', 'cache_read_1k', 0.003000, true, '$3/MTok cache read, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.7-fast', 'cache_write_1k', 0.037500, true, '$37.50/MTok cache write, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.8-fast', 'input_tokens_1k', 0.010000, true, '$10/MTok input, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.8-fast', 'output_tokens_1k', 0.050000, true, '$50/MTok output, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.8-fast', 'cache_read_1k', 0.001000, true, '$1/MTok cache read, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000),
  ('anthropic', 'claude-opus-4.8-fast', 'cache_write_1k', 0.012500, true, '$12.50/MTok cache write, OpenRouter verified fast variant', 'llm', 'USD', 1000000, 128000)
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
  ('anthropic', 'claude-haiku-4.5', 'Claude Haiku 4.5', true, true, 'openrouter_verified', 200000, 64000, array['text','image','file'], array['text'], array['include_reasoning','max_tokens','reasoning','response_format','stop','structured_outputs','temperature','tool_choice','tools','top_k','top_p'], true, '{"reasoning":{"transport":"none","levels":["none"]},"context":{"tiers":[{"tokens":200000,"label":"200K","pricingProfile":"standard"}]},"speed":{"available":false}}'::jsonb, '{"id":"anthropic/claude-haiku-4.5","canonical_slug":"anthropic/claude-4.5-haiku-20251001","name":"Anthropic: Claude Haiku 4.5"}'::jsonb, now()),
  ('anthropic', 'claude-opus-4.6', 'Claude Opus 4.6', true, true, 'openrouter_verified', 1000000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_completion_tokens','max_tokens','reasoning','response_format','stop','structured_outputs','temperature','tool_choice','tools','top_k','top_p','verbosity'], true, '{"reasoning":{"transport":"verbosity","levels":["low","medium","high","max"]},"context":{"tiers":[{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]},"speed":{"available":true,"fastModelId":"anthropic/claude-opus-4.6-fast"}}'::jsonb, '{"id":"anthropic/claude-opus-4.6","canonical_slug":"anthropic/claude-4.6-opus-20260205","name":"Anthropic: Claude Opus 4.6"}'::jsonb, now()),
  ('anthropic', 'claude-opus-4.6-fast', 'Claude Opus 4.6 Fast', true, false, 'openrouter_verified', 1000000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_tokens','reasoning','response_format','stop','structured_outputs','temperature','tool_choice','tools','top_p','verbosity'], true, '{"reasoning":{"transport":"verbosity","levels":["low","medium","high","max"]},"context":{"tiers":[{"tokens":1000000,"label":"1M","pricingProfile":"fast"}]},"speed":{"variantOf":"anthropic/claude-opus-4.6"}}'::jsonb, '{"id":"anthropic/claude-opus-4.6-fast","canonical_slug":"anthropic/claude-4.6-opus-fast-20260407","name":"Anthropic: Claude Opus 4.6 (Fast)"}'::jsonb, now()),
  ('anthropic', 'claude-opus-4.7', 'Claude Opus 4.7', true, true, 'openrouter_verified', 1000000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_tokens','reasoning','response_format','stop','structured_outputs','tool_choice','tools','verbosity'], true, '{"reasoning":{"transport":"verbosity","levels":["low","medium","high","xhigh","max"]},"context":{"tiers":[{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]},"speed":{"available":true,"fastModelId":"anthropic/claude-opus-4.7-fast"}}'::jsonb, '{"id":"anthropic/claude-opus-4.7","canonical_slug":"anthropic/claude-4.7-opus-20260416","name":"Anthropic: Claude Opus 4.7"}'::jsonb, now()),
  ('anthropic', 'claude-opus-4.7-fast', 'Claude Opus 4.7 Fast', true, false, 'openrouter_verified', 1000000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_tokens','reasoning','response_format','stop','structured_outputs','tool_choice','tools','verbosity'], true, '{"reasoning":{"transport":"verbosity","levels":["low","medium","high","xhigh","max"]},"context":{"tiers":[{"tokens":1000000,"label":"1M","pricingProfile":"fast"}]},"speed":{"variantOf":"anthropic/claude-opus-4.7"}}'::jsonb, '{"id":"anthropic/claude-opus-4.7-fast","canonical_slug":"anthropic/claude-4.7-opus-fast-20260512","name":"Anthropic: Claude Opus 4.7 (Fast)"}'::jsonb, now()),
  ('anthropic', 'claude-opus-4.8', 'Claude Opus 4.8', true, true, 'openrouter_verified', 1000000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_tokens','reasoning','response_format','stop','structured_outputs','tool_choice','tools','verbosity'], true, '{"reasoning":{"transport":"verbosity","levels":["low","medium","high","xhigh","max"]},"context":{"tiers":[{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]},"speed":{"available":true,"fastModelId":"anthropic/claude-opus-4.8-fast"}}'::jsonb, '{"id":"anthropic/claude-opus-4.8","canonical_slug":"anthropic/claude-4.8-opus-20260528","name":"Anthropic: Claude Opus 4.8"}'::jsonb, now()),
  ('anthropic', 'claude-opus-4.8-fast', 'Claude Opus 4.8 Fast', true, false, 'openrouter_verified', 1000000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_tokens','reasoning','response_format','stop','structured_outputs','tool_choice','tools','verbosity'], true, '{"reasoning":{"transport":"verbosity","levels":["low","medium","high","xhigh","max"]},"context":{"tiers":[{"tokens":1000000,"label":"1M","pricingProfile":"fast"}]},"speed":{"variantOf":"anthropic/claude-opus-4.8"}}'::jsonb, '{"id":"anthropic/claude-opus-4.8-fast","canonical_slug":"anthropic/claude-4.8-opus-fast-20260528","name":"Anthropic: Claude Opus 4.8 (Fast)"}'::jsonb, now()),
  ('anthropic', 'claude-sonnet-4.6', 'Claude Sonnet 4.6', true, true, 'openrouter_verified', 1000000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_completion_tokens','max_tokens','reasoning','response_format','stop','structured_outputs','temperature','tool_choice','tools','top_k','top_p','verbosity'], true, '{"reasoning":{"transport":"verbosity","levels":["low","medium","high","max"]},"context":{"tiers":[{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]},"speed":{"available":false}}'::jsonb, '{"id":"anthropic/claude-sonnet-4.6","canonical_slug":"anthropic/claude-4.6-sonnet-20260217","name":"Anthropic: Claude Sonnet 4.6"}'::jsonb, now()),
  ('deepseek', 'deepseek-v4-flash', 'DeepSeek V4 Flash', true, true, 'openrouter_verified', 1048576, 131072, array['text'], array['text'], array['frequency_penalty','include_reasoning','logit_bias','logprobs','max_tokens','min_p','presence_penalty','reasoning','repetition_penalty','response_format','seed','stop','structured_outputs','temperature','tool_choice','tools','top_k','top_logprobs','top_p'], false, '{"reasoning":{"transport":"none","levels":["none"]},"context":{"tiers":[{"tokens":1048576,"label":"1M","pricingProfile":"standard"}]},"speed":{"available":false}}'::jsonb, '{"id":"deepseek/deepseek-v4-flash","canonical_slug":"deepseek/deepseek-v4-flash-20260423","name":"DeepSeek: DeepSeek V4 Flash"}'::jsonb, now()),
  ('google', 'gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview', true, true, 'openrouter_verified', 1048576, 65536, array['audio','file','image','text','video'], array['text'], array['include_reasoning','max_tokens','reasoning','response_format','seed','stop','structured_outputs','temperature','tool_choice','tools','top_p'], true, '{"reasoning":{"transport":"none","levels":["none"]},"context":{"tiers":[{"tokens":1048576,"label":"1M","pricingProfile":"standard"}]},"speed":{"available":false}}'::jsonb, '{"id":"google/gemini-3.1-pro-preview","canonical_slug":"google/gemini-3.1-pro-preview-20260219","name":"Google: Gemini 3.1 Pro Preview"}'::jsonb, now()),
  ('google', 'gemini-3.5-flash', 'Gemini 3.5 Flash', true, true, 'openrouter_verified', 1048576, 65536, array['text','image','video','file','audio'], array['text'], array['include_reasoning','max_tokens','reasoning','response_format','seed','stop','structured_outputs','temperature','tool_choice','tools','top_p'], true, '{"reasoning":{"transport":"none","levels":["none"]},"context":{"tiers":[{"tokens":1048576,"label":"1M","pricingProfile":"standard"}]},"speed":{"available":false}}'::jsonb, '{"id":"google/gemini-3.5-flash","canonical_slug":"google/gemini-3.5-flash-20260519","name":"Google: Gemini 3.5 Flash"}'::jsonb, now()),
  ('minimax', 'minimax-m2.5', 'MiniMax M2.5', true, true, 'openrouter_verified', 204800, 196608, array['text'], array['text'], array['frequency_penalty','include_reasoning','logit_bias','logprobs','max_tokens','min_p','parallel_tool_calls','presence_penalty','reasoning','reasoning_effort','repetition_penalty','response_format','seed','stop','structured_outputs','temperature','tool_choice','tools','top_k','top_logprobs','top_p'], false, '{"reasoning":{"transport":"none","levels":["none"]},"context":{"tiers":[{"tokens":204800,"label":"200K","pricingProfile":"standard"}]},"speed":{"available":false}}'::jsonb, '{"id":"minimax/minimax-m2.5","canonical_slug":"minimax/minimax-m2.5-20260211","name":"MiniMax: MiniMax M2.5"}'::jsonb, now()),
  ('openai', 'gpt-5.3-codex', 'GPT-5.3 Codex', true, true, 'openrouter_verified', 400000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_completion_tokens','max_tokens','reasoning','response_format','seed','structured_outputs','tool_choice','tools'], true, '{"reasoning":{"transport":"reasoning.effort","levels":["none","low","medium","high","xhigh"]},"context":{"tiers":[{"tokens":400000,"label":"400K","pricingProfile":"standard"}]},"speed":{"available":false}}'::jsonb, '{"id":"openai/gpt-5.3-codex","canonical_slug":"openai/gpt-5.3-codex-20260224","name":"OpenAI: GPT-5.3-Codex"}'::jsonb, now()),
  ('openai', 'gpt-5.4', 'GPT-5.4', true, true, 'openrouter_verified', 1050000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_completion_tokens','max_tokens','reasoning','response_format','seed','structured_outputs','tool_choice','tools'], true, '{"reasoning":{"transport":"reasoning.effort","levels":["none","low","medium","high","xhigh"]},"context":{"tiers":[{"tokens":272000,"label":"272K","pricingProfile":"standard"},{"tokens":1050000,"label":"1M","pricingProfile":"extended"}]},"speed":{"available":false}}'::jsonb, '{"id":"openai/gpt-5.4","canonical_slug":"openai/gpt-5.4-20260305","name":"OpenAI: GPT-5.4"}'::jsonb, now()),
  ('openai', 'gpt-5.4-pro', 'GPT-5.4 Pro', true, true, 'openrouter_verified', 1050000, 128000, array['text','image','file'], array['text'], array['include_reasoning','max_completion_tokens','max_tokens','reasoning','response_format','seed','structured_outputs','tool_choice','tools'], true, '{"reasoning":{"transport":"reasoning.effort","levels":["none","low","medium","high","xhigh"]},"context":{"tiers":[{"tokens":272000,"label":"272K","pricingProfile":"standard"},{"tokens":1050000,"label":"1M","pricingProfile":"extended"}]},"speed":{"available":false}}'::jsonb, '{"id":"openai/gpt-5.4-pro","canonical_slug":"openai/gpt-5.4-pro-20260305","name":"OpenAI: GPT-5.4 Pro"}'::jsonb, now()),
  ('openai', 'gpt-5.5', 'GPT-5.5', true, true, 'openrouter_verified', 1050000, 128000, array['file','image','text'], array['text'], array['include_reasoning','max_completion_tokens','max_tokens','reasoning','response_format','seed','structured_outputs','tool_choice','tools'], true, '{"reasoning":{"transport":"reasoning.effort","levels":["none","low","medium","high","xhigh"]},"context":{"tiers":[{"tokens":272000,"label":"272K","pricingProfile":"standard"},{"tokens":1050000,"label":"1M","pricingProfile":"extended"}]},"speed":{"available":false}}'::jsonb, '{"id":"openai/gpt-5.5","canonical_slug":"openai/gpt-5.5-20260423","name":"OpenAI: GPT-5.5"}'::jsonb, now())
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
