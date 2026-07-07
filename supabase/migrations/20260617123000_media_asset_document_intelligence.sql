alter table public.media_assets
  add column if not exists document_intelligence jsonb not null default '{}'::jsonb;

comment on column public.media_assets.document_intelligence is
  'Document extraction status, strategy, text quality, and processing metadata.';
