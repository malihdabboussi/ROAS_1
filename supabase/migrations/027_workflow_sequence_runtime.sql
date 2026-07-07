-- Workflow sequence runtime wiring:
-- - attach sequence references to single-email schedules
-- - enforce idempotency per lead+sequence email step

alter table if exists public.email_single_schedules
  add column if not exists sequence_id uuid references public.sequences(id) on delete set null;

alter table if exists public.email_single_schedules
  add column if not exists sequence_email_id uuid references public.sequence_emails(id) on delete set null;

create index if not exists idx_email_single_schedules_sequence_id
  on public.email_single_schedules(sequence_id);

create index if not exists idx_email_single_schedules_sequence_email_id
  on public.email_single_schedules(sequence_email_id);

create unique index if not exists uniq_email_single_schedules_lead_sequence_email
  on public.email_single_schedules(user_id, lead_id, sequence_email_id);

create unique index if not exists uniq_sequence_email_sends_lead_sequence_email
  on public.sequence_email_sends(user_id, lead_id, sequence_email_id);
