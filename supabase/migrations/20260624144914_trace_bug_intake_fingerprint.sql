create unique index if not exists idx_space_items_trace_bug_fingerprint
  on public.space_items (space_id, (custom_data->>'trace_bug_fingerprint'))
  where source = 'daily_trace_triage'
    and custom_data ? 'trace_bug_fingerprint'
    and coalesce(custom_data->>'trace_bug_fingerprint', '') <> '';

create index if not exists idx_space_items_trace_bug_intake_recent
  on public.space_items (space_id, status, created_at desc)
  where source = 'daily_trace_triage'
    and custom_data->>'category' = 'bugs';
