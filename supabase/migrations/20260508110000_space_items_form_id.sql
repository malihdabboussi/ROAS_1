-- Track which form created a task/space item so dedicated form response views
-- can render only submissions for a specific form.

ALTER TABLE public.space_items
  ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_space_items_form_id
  ON public.space_items(form_id)
  WHERE form_id IS NOT NULL;

UPDATE public.space_items AS si
SET form_id = fr.form_id
FROM public.form_responses AS fr
WHERE fr.space_item_id = si.id
  AND si.form_id IS NULL;
