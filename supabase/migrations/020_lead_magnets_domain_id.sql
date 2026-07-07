alter table public.lead_magnets
add column if not exists domain_id uuid null references public.domains(id) on delete set null;

