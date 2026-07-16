-- Provision shared media (and campaigns) storage buckets used by media library uploads
-- and generate_image. Table policies already reference bucket_id = 'media', but no
-- migration previously inserted the buckets on ROAS (same drift class as session_transcripts).
-- Create with a safe default limit first; raise to 2.5 GB to match prior Vibey raise migration.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('media', 'media', false, 52428800),
  ('campaigns', 'campaigns', false, 52428800)
on conflict (id) do update
set
  name = excluded.name,
  public = false;

update storage.buckets
set file_size_limit = 2684354560
where id in ('media', 'campaigns');
