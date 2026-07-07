alter table public.app_errors
  add column if not exists trace_id uuid,
  add column if not exists message_id uuid,
  add column if not exists request_id text,
  add column if not exists run_id text,
  add column if not exists conversation_id uuid;

create index if not exists idx_app_errors_trace_id_created_at
  on public.app_errors (trace_id, created_at desc)
  where trace_id is not null;

create index if not exists idx_app_errors_message_id_created_at
  on public.app_errors (message_id, created_at desc)
  where message_id is not null;

create index if not exists idx_app_errors_request_id_created_at
  on public.app_errors (request_id, created_at desc)
  where request_id is not null;

create index if not exists idx_app_errors_run_id_created_at
  on public.app_errors (run_id, created_at desc)
  where run_id is not null;

create index if not exists idx_app_errors_conversation_id_created_at
  on public.app_errors (conversation_id, created_at desc)
  where conversation_id is not null;

alter table public.vb_agent_traces
  add column if not exists message_id uuid,
  add column if not exists run_id text,
  add column if not exists request_id text,
  add column if not exists terminal_status text,
  add column if not exists user_visible_outcome text,
  add column if not exists recovery_status text default 'none',
  add column if not exists recovery_events jsonb not null default '[]'::jsonb,
  add column if not exists observability jsonb not null default '{}'::jsonb;

alter table public.vb_agent_traces
  drop constraint if exists vb_agent_traces_terminal_status_check;

alter table public.vb_agent_traces
  add constraint vb_agent_traces_terminal_status_check
  check (
    terminal_status is null
    or terminal_status in ('done', 'failed', 'failed_recoverable', 'cancelled')
  );

alter table public.vb_agent_traces
  drop constraint if exists vb_agent_traces_user_visible_outcome_check;

alter table public.vb_agent_traces
  add constraint vb_agent_traces_user_visible_outcome_check
  check (
    user_visible_outcome is null
    or user_visible_outcome in (
      'output_visible',
      'recovered_output',
      'no_visible_output',
      'blocked',
      'cancelled'
    )
  );

alter table public.vb_agent_traces
  drop constraint if exists vb_agent_traces_recovery_status_check;

alter table public.vb_agent_traces
  add constraint vb_agent_traces_recovery_status_check
  check (
    recovery_status is null
    or recovery_status in (
      'none',
      'recovered',
      'failed_recoverable',
      'failed_unrecoverable',
      'cancelled'
    )
  );

create index if not exists idx_vb_agent_traces_message_id_created_at
  on public.vb_agent_traces (message_id, created_at desc)
  where message_id is not null;

create index if not exists idx_vb_agent_traces_run_id_created_at
  on public.vb_agent_traces (run_id, created_at desc)
  where run_id is not null;

create index if not exists idx_vb_agent_traces_request_id_created_at
  on public.vb_agent_traces (request_id, created_at desc)
  where request_id is not null;

create index if not exists idx_vb_agent_traces_terminal_status_created_at
  on public.vb_agent_traces (terminal_status, created_at desc)
  where terminal_status is not null;

create index if not exists idx_vb_agent_traces_user_visible_outcome_created_at
  on public.vb_agent_traces (user_visible_outcome, created_at desc)
  where user_visible_outcome is not null;

create index if not exists idx_vb_agent_traces_recovery_status_created_at
  on public.vb_agent_traces (recovery_status, created_at desc)
  where recovery_status is not null;
