ALTER TABLE public.user_widgets
  ADD COLUMN IF NOT EXISTS widget_definition JSONB;

CREATE INDEX IF NOT EXISTS idx_user_widgets_definition_v2
  ON public.user_widgets ((widget_definition->>'version'))
  WHERE widget_definition IS NOT NULL;
