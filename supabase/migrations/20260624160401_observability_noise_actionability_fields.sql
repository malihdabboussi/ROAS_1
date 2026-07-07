alter table public.app_errors
  add column if not exists is_expected boolean not null default false,
  add column if not exists noise_class text,
  add column if not exists user_actionable boolean,
  add column if not exists platform_actionable boolean,
  add column if not exists should_open_bug boolean,
  add column if not exists triage_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_app_errors_noise_class_created_at
  on public.app_errors (noise_class, created_at desc)
  where noise_class is not null;

create index if not exists idx_app_errors_should_open_bug_created_at
  on public.app_errors (should_open_bug, created_at desc)
  where should_open_bug is not null;

alter table public.vb_agent_traces
  add column if not exists is_expected boolean not null default false,
  add column if not exists noise_class text,
  add column if not exists user_actionable boolean,
  add column if not exists platform_actionable boolean,
  add column if not exists should_open_bug boolean,
  add column if not exists triage_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_vb_agent_traces_noise_class_created_at
  on public.vb_agent_traces (noise_class, created_at desc)
  where noise_class is not null;

create index if not exists idx_vb_agent_traces_should_open_bug_created_at
  on public.vb_agent_traces (should_open_bug, created_at desc)
  where should_open_bug is not null;

alter table public.agent_runtime_runs
  add column if not exists request_id text,
  add column if not exists trace_id uuid,
  add column if not exists observability jsonb not null default '{}'::jsonb,
  add column if not exists is_expected boolean not null default false,
  add column if not exists noise_class text,
  add column if not exists user_actionable boolean,
  add column if not exists platform_actionable boolean,
  add column if not exists should_open_bug boolean,
  add column if not exists triage_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_agent_runtime_runs_request_id_created_at
  on public.agent_runtime_runs (request_id, created_at desc)
  where request_id is not null;

create index if not exists idx_agent_runtime_runs_trace_id_created_at
  on public.agent_runtime_runs (trace_id, created_at desc)
  where trace_id is not null;

create index if not exists idx_agent_runtime_runs_noise_class_created_at
  on public.agent_runtime_runs (noise_class, created_at desc)
  where noise_class is not null;

create index if not exists idx_agent_runtime_runs_should_open_bug_created_at
  on public.agent_runtime_runs (should_open_bug, created_at desc)
  where should_open_bug is not null;

alter table if exists public.request_trace_events
  add column if not exists is_expected boolean not null default false,
  add column if not exists noise_class text,
  add column if not exists user_actionable boolean,
  add column if not exists platform_actionable boolean,
  add column if not exists should_open_bug boolean,
  add column if not exists triage_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_request_trace_events_noise_class_created_at
  on public.request_trace_events (noise_class, created_at desc)
  where noise_class is not null;

create index if not exists idx_request_trace_events_should_open_bug_created_at
  on public.request_trace_events (should_open_bug, created_at desc)
  where should_open_bug is not null;

alter table public.vb_message_timeline_events
  add column if not exists request_id text,
  add column if not exists run_id text,
  add column if not exists trace_id uuid,
  add column if not exists error_code text,
  add column if not exists error_class text,
  add column if not exists workflow_class text,
  add column if not exists effect_state text,
  add column if not exists retry_policy text,
  add column if not exists observability jsonb not null default '{}'::jsonb,
  add column if not exists is_expected boolean not null default false,
  add column if not exists noise_class text,
  add column if not exists user_actionable boolean,
  add column if not exists platform_actionable boolean,
  add column if not exists should_open_bug boolean,
  add column if not exists triage_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_vb_message_timeline_events_request_id_created_at
  on public.vb_message_timeline_events (request_id, created_at desc)
  where request_id is not null;

create index if not exists idx_vb_message_timeline_events_run_id_created_at
  on public.vb_message_timeline_events (run_id, created_at desc)
  where run_id is not null;

create index if not exists idx_vb_message_timeline_events_trace_id_created_at
  on public.vb_message_timeline_events (trace_id, created_at desc)
  where trace_id is not null;

create index if not exists idx_vb_message_timeline_events_error_code_created_at
  on public.vb_message_timeline_events (error_code, created_at desc)
  where error_code is not null;

create index if not exists idx_vb_message_timeline_events_workflow_class_created_at
  on public.vb_message_timeline_events (workflow_class, created_at desc)
  where workflow_class is not null;

create index if not exists idx_vb_message_timeline_events_noise_class_created_at
  on public.vb_message_timeline_events (noise_class, created_at desc)
  where noise_class is not null;

create index if not exists idx_vb_message_timeline_events_should_open_bug_created_at
  on public.vb_message_timeline_events (should_open_bug, created_at desc)
  where should_open_bug is not null;
