alter table public.app_errors
  add column if not exists source_file text,
  add column if not exists source_line integer,
  add column if not exists source_column integer,
  add column if not exists function_name text,
  add column if not exists runtime_file text,
  add column if not exists runtime_line integer,
  add column if not exists runtime_column integer,
  add column if not exists commit_sha text,
  add column if not exists release_id text,
  add column if not exists build_id text,
  add column if not exists source_resolved boolean not null default false,
  add column if not exists code_context jsonb not null default '{}'::jsonb;

alter table public.app_errors
  drop constraint if exists app_errors_source_line_positive;

alter table public.app_errors
  add constraint app_errors_source_line_positive
  check (source_line is null or source_line > 0);

alter table public.app_errors
  drop constraint if exists app_errors_source_column_positive;

alter table public.app_errors
  add constraint app_errors_source_column_positive
  check (source_column is null or source_column > 0);

create index if not exists idx_app_errors_source_file_line_created_at
  on public.app_errors (source_file, source_line, created_at desc)
  where source_file is not null;

create index if not exists idx_app_errors_commit_sha_created_at
  on public.app_errors (commit_sha, created_at desc)
  where commit_sha is not null;

create index if not exists idx_app_errors_release_build_created_at
  on public.app_errors (release_id, build_id, created_at desc)
  where release_id is not null;

create table if not exists public.request_trace_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id text,
  trace_id uuid,
  message_id uuid,
  run_id text,
  conversation_id uuid,
  user_id uuid,
  org_id uuid,
  surface text not null,
  service text,
  route text,
  method text,
  event_type text not null,
  stage text,
  status text,
  status_code integer,
  duration_ms integer,
  span_id text,
  parent_span_id text,
  error_code text,
  error_class text,
  workflow_class text,
  effect_state text,
  retry_policy text,
  source_file text,
  source_line integer,
  source_column integer,
  function_name text,
  runtime_file text,
  runtime_line integer,
  runtime_column integer,
  commit_sha text,
  release_id text,
  build_id text,
  source_resolved boolean not null default false,
  code_context jsonb not null default '{}'::jsonb,
  observability jsonb not null default '{}'::jsonb
);

alter table public.request_trace_events enable row level security;

revoke all on table public.request_trace_events from anon, authenticated;

alter table public.request_trace_events
  drop constraint if exists request_trace_events_source_line_positive;

alter table public.request_trace_events
  add constraint request_trace_events_source_line_positive
  check (source_line is null or source_line > 0);

alter table public.request_trace_events
  drop constraint if exists request_trace_events_source_column_positive;

alter table public.request_trace_events
  add constraint request_trace_events_source_column_positive
  check (source_column is null or source_column > 0);

alter table public.request_trace_events
  drop constraint if exists request_trace_events_duration_ms_nonnegative;

alter table public.request_trace_events
  add constraint request_trace_events_duration_ms_nonnegative
  check (duration_ms is null or duration_ms >= 0);

create index if not exists idx_request_trace_events_request_id_created_at
  on public.request_trace_events (request_id, created_at desc)
  where request_id is not null;

create index if not exists idx_request_trace_events_trace_id_created_at
  on public.request_trace_events (trace_id, created_at desc)
  where trace_id is not null;

create index if not exists idx_request_trace_events_message_id_created_at
  on public.request_trace_events (message_id, created_at desc)
  where message_id is not null;

create index if not exists idx_request_trace_events_run_id_created_at
  on public.request_trace_events (run_id, created_at desc)
  where run_id is not null;

create index if not exists idx_request_trace_events_conversation_id_created_at
  on public.request_trace_events (conversation_id, created_at desc)
  where conversation_id is not null;

create index if not exists idx_request_trace_events_source_file_line_created_at
  on public.request_trace_events (source_file, source_line, created_at desc)
  where source_file is not null;

create index if not exists idx_request_trace_events_commit_sha_created_at
  on public.request_trace_events (commit_sha, created_at desc)
  where commit_sha is not null;

create index if not exists idx_request_trace_events_build_created_at
  on public.request_trace_events (release_id, build_id, created_at desc)
  where release_id is not null;

create index if not exists idx_request_trace_events_recent_event_type
  on public.request_trace_events (created_at desc, event_type, stage);

create table if not exists public.source_map_artifacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  app text not null,
  release_id text not null,
  build_id text,
  commit_sha text,
  asset_url text not null,
  source_map_storage_path text not null,
  source_root text,
  artifact_kind text not null default 'browser_source_map',
  metadata jsonb not null default '{}'::jsonb
);

alter table public.source_map_artifacts enable row level security;

revoke all on table public.source_map_artifacts from anon, authenticated;

create unique index if not exists idx_source_map_artifacts_app_release_asset
  on public.source_map_artifacts (app, release_id, asset_url);

create index if not exists idx_source_map_artifacts_build
  on public.source_map_artifacts (app, build_id, created_at desc)
  where build_id is not null;

create index if not exists idx_source_map_artifacts_commit
  on public.source_map_artifacts (commit_sha, created_at desc)
  where commit_sha is not null;

insert into storage.buckets (id, name, public)
values ('observability-source-maps', 'observability-source-maps', false)
on conflict (id) do update set public = false;
