-- Expand mission_deliverables.type to support structured entity deliverables
-- and add entity_id / entity_table to link back to domain tables.

ALTER TABLE public.mission_deliverables
  DROP CONSTRAINT IF EXISTS mission_deliverables_type_check;

ALTER TABLE public.mission_deliverables
  ADD CONSTRAINT mission_deliverables_type_check
  CHECK (type IN (
    'doc', 'text', 'image', 'video', 'pdf', 'file',
    'offer', 'funnel', 'presentation', 'sequence',
    'blog_post', 'social_post', 'ad', 'ad_campaign',
    'avatar', 'website'
  ));

ALTER TABLE public.mission_deliverables
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS entity_table TEXT;

CREATE INDEX IF NOT EXISTS idx_mission_deliverables_entity
  ON public.mission_deliverables (entity_id)
  WHERE entity_id IS NOT NULL;
