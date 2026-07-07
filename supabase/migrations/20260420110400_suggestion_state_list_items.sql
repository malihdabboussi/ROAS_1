-- suggestion_state lifecycle for agent-suggested list items.
-- NULL for non-suggestions. New agent-suggested inserts default to 'pending'.
-- Existing agent-suggested rows are backfilled to 'accepted' to preserve behavior.

ALTER TABLE public.list_items
  ADD COLUMN IF NOT EXISTS suggestion_state TEXT
    CHECK (suggestion_state IN ('pending','accepted','dismissed'));

UPDATE public.list_items
SET suggestion_state = 'accepted'
WHERE source = 'agent_suggested' AND suggestion_state IS NULL;

CREATE INDEX IF NOT EXISTS idx_list_items_suggestion_state
  ON public.list_items(suggestion_state)
  WHERE suggestion_state IS NOT NULL;

CREATE OR REPLACE FUNCTION public.default_list_item_suggestion_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source = 'agent_suggested' AND NEW.suggestion_state IS NULL THEN
    NEW.suggestion_state := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_list_item_suggestion_state ON public.list_items;
CREATE TRIGGER trg_default_list_item_suggestion_state
  BEFORE INSERT ON public.list_items
  FOR EACH ROW EXECUTE FUNCTION public.default_list_item_suggestion_state();
