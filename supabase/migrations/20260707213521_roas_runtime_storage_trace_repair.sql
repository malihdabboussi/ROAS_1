-- Repair ROAS runtime objects required by agent-api streaming.

insert into storage.buckets (id, name, public, file_size_limit)
values ('session_transcripts', 'session_transcripts', false, 52428800)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit;

alter table public.vb_agent_traces
  add column if not exists cost_usd numeric(12, 6);
