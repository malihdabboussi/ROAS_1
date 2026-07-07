create table if not exists public.llm_model_pricing_tiers (
  provider text not null,
  model_name text not null,
  pricing_profile text not null,
  token_threshold_min integer not null default 0,
  token_threshold_max integer,
  input_tokens_1k numeric(12,6),
  output_tokens_1k numeric(12,6),
  cache_read_1k numeric(12,6),
  cache_write_1k numeric(12,6),
  currency text not null default 'USD',
  source text not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint llm_model_pricing_tiers_pkey primary key (
    provider,
    model_name,
    pricing_profile,
    token_threshold_min
  ),
  constraint llm_model_pricing_tiers_min_nonnegative check (token_threshold_min >= 0),
  constraint llm_model_pricing_tiers_max_valid check (
    token_threshold_max is null or token_threshold_max >= token_threshold_min
  ),
  constraint llm_model_pricing_tiers_prices_nonnegative check (
    (input_tokens_1k is null or input_tokens_1k >= 0)
    and (output_tokens_1k is null or output_tokens_1k >= 0)
    and (cache_read_1k is null or cache_read_1k >= 0)
    and (cache_write_1k is null or cache_write_1k >= 0)
  )
);

create index if not exists llm_model_pricing_tiers_active_idx
  on public.llm_model_pricing_tiers (
    is_active,
    provider,
    model_name,
    token_threshold_min,
    token_threshold_max
  );

alter table public.llm_model_pricing_tiers enable row level security;

drop policy if exists "llm_model_pricing_tiers_service_role_full"
  on public.llm_model_pricing_tiers;
create policy "llm_model_pricing_tiers_service_role_full"
  on public.llm_model_pricing_tiers
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "llm_model_pricing_tiers_public_read_active"
  on public.llm_model_pricing_tiers;
create policy "llm_model_pricing_tiers_public_read_active"
  on public.llm_model_pricing_tiers
  for select
  to anon, authenticated
  using (is_active = true);

create or replace function public.touch_llm_model_pricing_tiers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_llm_model_pricing_tiers_updated_at
  on public.llm_model_pricing_tiers;

create trigger touch_llm_model_pricing_tiers_updated_at
  before update on public.llm_model_pricing_tiers
  for each row
  execute function public.touch_llm_model_pricing_tiers_updated_at();

insert into public.llm_model_pricing_tiers (
  provider,
  model_name,
  pricing_profile,
  token_threshold_min,
  token_threshold_max,
  input_tokens_1k,
  output_tokens_1k,
  cache_read_1k,
  cache_write_1k,
  currency,
  source,
  is_active
)
values
  (
    'openai',
    'gpt-5.5',
    'standard',
    0,
    272000,
    0.005000,
    0.030000,
    0.000500,
    null,
    'USD',
    'openrouter_provider_pricing_screenshot_2026-06-05',
    true
  ),
  (
    'openai',
    'gpt-5.5',
    'extended',
    272001,
    null,
    0.010000,
    0.045000,
    0.001000,
    null,
    'USD',
    'openrouter_provider_pricing_screenshot_2026-06-05',
    true
  )
on conflict (provider, model_name, pricing_profile, token_threshold_min) do update
set token_threshold_max = excluded.token_threshold_max,
    input_tokens_1k = excluded.input_tokens_1k,
    output_tokens_1k = excluded.output_tokens_1k,
    cache_read_1k = excluded.cache_read_1k,
    cache_write_1k = excluded.cache_write_1k,
    currency = excluded.currency,
    source = excluded.source,
    is_active = excluded.is_active,
    updated_at = now();
