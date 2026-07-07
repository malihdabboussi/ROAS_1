BEGIN;

CREATE TABLE IF NOT EXISTS public.space_automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  badge TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  workflows TEXT[] NOT NULL DEFAULT '{}'::text[],
  integration TEXT,
  trigger_group TEXT,
  body JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  install_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT space_automation_templates_template_key_key UNIQUE (template_key)
);

CREATE INDEX IF NOT EXISTS space_automation_templates_active_sort_idx
  ON public.space_automation_templates (is_active, sort_order, title);

ALTER TABLE public.space_automation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS space_automation_templates_read_authenticated
  ON public.space_automation_templates;
CREATE POLICY space_automation_templates_read_authenticated
  ON public.space_automation_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP TRIGGER IF EXISTS set_space_automation_templates_updated_at
  ON public.space_automation_templates;
CREATE TRIGGER set_space_automation_templates_updated_at
  BEFORE UPDATE ON public.space_automation_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
