-- Space Templates catalog (read-only for authenticated users)

CREATE TABLE IF NOT EXISTS public.space_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'layout-grid',
  icon_color TEXT NOT NULL DEFAULT 'default',
  category TEXT NOT NULL,
  persona TEXT,
  badge TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  schema JSONB NOT NULL,
  channel_name TEXT,
  channel_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_templates_published
  ON public.space_templates (is_published, sort_order);

CREATE INDEX IF NOT EXISTS idx_space_templates_category
  ON public.space_templates (category);

CREATE TABLE IF NOT EXISTS public.space_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.space_templates(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('task', 'doc')),
  title TEXT NOT NULL,
  status TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  description TEXT,
  body TEXT,
  custom_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_template_items_template
  ON public.space_template_items (template_id, kind, sort_order);

CREATE TABLE IF NOT EXISTS public.space_template_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.space_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger JSONB NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_template_automations_template
  ON public.space_template_automations (template_id);

ALTER TABLE public.space_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_template_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS space_templates_read_authenticated ON public.space_templates;
CREATE POLICY space_templates_read_authenticated
  ON public.space_templates FOR SELECT TO authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS space_template_items_read_authenticated ON public.space_template_items;
CREATE POLICY space_template_items_read_authenticated
  ON public.space_template_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.space_templates t
      WHERE t.id = space_template_items.template_id AND t.is_published = true
    )
  );

DROP POLICY IF EXISTS space_template_automations_read_authenticated ON public.space_template_automations;
CREATE POLICY space_template_automations_read_authenticated
  ON public.space_template_automations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.space_templates t
      WHERE t.id = space_template_automations.template_id AND t.is_published = true
    )
  );

CREATE OR REPLACE FUNCTION public.touch_space_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_space_templates_updated_at ON public.space_templates;
CREATE TRIGGER trg_space_templates_updated_at
  BEFORE UPDATE ON public.space_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_space_templates_updated_at();
