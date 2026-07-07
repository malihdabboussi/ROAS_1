alter table public.lead_magnets
add column if not exists hide_branding boolean not null default false;

