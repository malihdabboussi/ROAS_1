-- Optional preset id for note card surface (matches space tag color presets); null = neutral card-glass
alter table public.contact_notes add column if not exists card_tint text;
