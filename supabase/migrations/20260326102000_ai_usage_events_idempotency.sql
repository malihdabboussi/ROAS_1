alter table public.ai_usage_events
  add column if not exists idempotency_key text;

create unique index if not exists idx_ai_usage_events_idempotency_key
  on public.ai_usage_events(idempotency_key)
  where idempotency_key is not null;
