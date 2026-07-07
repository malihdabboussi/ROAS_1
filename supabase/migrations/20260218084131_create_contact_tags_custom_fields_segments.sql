
-- 1. contact_custom_field_definitions
CREATE TABLE public.contact_custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  field_key text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT '[]'::jsonb,
  default_value text,
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name),
  UNIQUE (user_id, field_key)
);

ALTER TABLE public.contact_custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_custom_field_definitions_own"
  ON public.contact_custom_field_definitions
  FOR ALL
  USING (user_id = auth.uid());

-- 2. contact_tags
CREATE TABLE public.contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#8B5CF6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_tags_own"
  ON public.contact_tags
  FOR ALL
  USING (user_id = auth.uid());

-- 3. segments
CREATE TABLE public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  lead_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "segments_own"
  ON public.segments
  FOR ALL
  USING (user_id = auth.uid());
;
