ALTER TABLE public.space_items
  DROP CONSTRAINT IF EXISTS list_items_source_check;

ALTER TABLE public.space_items
  DROP CONSTRAINT IF EXISTS space_items_source_check;

ALTER TABLE public.space_items
  ADD CONSTRAINT space_items_source_check
  CHECK (source IN ('manual', 'agent', 'agent_suggested', 'template', 'fathom'));
