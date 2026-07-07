
-- Create branding_themes table
CREATE TABLE public.branding_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  slug text NOT NULL,
  name text NOT NULL,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text,
  preview_image_url text,
  logo_asset_id uuid,
  font_heading text,
  font_body text,
  brand_voice jsonb,
  brand_values jsonb,
  design_settings jsonb,
  image_style_prompt text,
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.branding_themes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY branding_themes_select_policy ON public.branding_themes
  FOR SELECT USING ((is_system = true) OR (user_id = (SELECT auth.uid())));

CREATE POLICY branding_themes_insert_policy ON public.branding_themes
  FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid())) AND (is_system = false));

CREATE POLICY branding_themes_update_policy ON public.branding_themes
  FOR UPDATE USING ((user_id = (SELECT auth.uid())) AND (is_system = false))
  WITH CHECK ((user_id = (SELECT auth.uid())) AND (is_system = false));

CREATE POLICY branding_themes_delete_policy ON public.branding_themes
  FOR DELETE USING ((user_id = (SELECT auth.uid())) AND (is_system = false));

-- Seed system themes
INSERT INTO public.branding_themes (id, slug, name, colors, is_system) VALUES
('90157ca1-ac7f-49b4-a328-f042857b651f', 'vibe-base-light', 'Vibe Base - Light', '{"body":"#5C5C5C","input":"#E7E7E7","border":"#E5E5E5","danger":"#EF4444","heading":"#161616","primary":"#10b981","success":"#34C759","warning":"#FF9500","primaryDark":"#059669","primaryLight":"#34d399","cardBackground":"#FFFFFF","pageBackground":"#FAFAFA","secondaryAccent1":"#00B8D4","secondaryAccent2":"#FF5470"}', true),
('040a676d-16d8-482c-9f40-73856a078a9a', 'vibe-base-dark', 'Vibe Base - Dark', '{"body":"#B8B8B8","input":"#252525","border":"#333333","danger":"#EF4444","heading":"#FFFFFF","primary":"#10b981","success":"#34C759","warning":"#FF9500","primaryDark":"#059669","primaryLight":"#34d399","cardBackground":"#1A1A1A","pageBackground":"#161616","secondaryAccent1":"#0d9488","secondaryAccent2":"#047857"}', true),
('94ee582b-51a6-4bf9-a263-5e02b29d761a', 'cosmic-purple', 'Cosmic Purple', '{"body":"#B8B8B8","input":"#252525","border":"#333333","danger":"#EF4444","heading":"#FFFFFF","primary":"linear-gradient(135deg, #B380FF 10%, #7AF0FF 90%)","success":"#34C759","warning":"#FF9500","primaryDark":"#9966FF","primaryLight":"#C9A3FF","cardBackground":"#1A1A1A","pageBackground":"#000000","secondaryAccent1":"#7AF0FF","secondaryAccent2":"#FF6B9D"}', true),
('55066425-c9b5-4d31-a47c-dc2a48edcd19', 'midnight-blue', 'Midnight Blue', '{"body":"#B8B8B8","input":"#1E2A45","border":"#2A3A5A","danger":"#EF4444","heading":"#FFFFFF","primary":"linear-gradient(135deg, #487CFF 6%, #7BAEFF 100%)","success":"#34C759","warning":"#FF9500","primaryDark":"#3A6FE6","primaryLight":"#7BAEFF","cardBackground":"#1A1A1A","pageBackground":"#0A0E27","secondaryAccent1":"#00D9E8","secondaryAccent2":"#FF6B9D"}', true),
('ec238add-88c5-4f4b-9c30-b7bbd4feaa34', 'sunset-glow', 'Sunset Glow', '{"body":"#5C5C5C","input":"#E7E7E7","border":"#E5E5E5","danger":"#EF4444","heading":"#161616","primary":"#6237C8","success":"#34C759","warning":"#FF9500","primaryDark":"#4E2BA3","primaryLight":"#8056E0","cardBackground":"#F8F8F8","pageBackground":"#FFFFFF","secondaryAccent1":"#FF6B9D","secondaryAccent2":"#FFB800"}', true),
('ce29e50c-04b6-4870-ac36-dc3dc2b06d14', 'crimson-night', 'Crimson Night', '{"body":"#B8B8B8","input":"#252525","border":"#333333","danger":"#EF4444","heading":"#FFFFFF","primary":"#C91313","success":"#34C759","warning":"#FF9500","primaryDark":"#A01010","primaryLight":"#E63946","cardBackground":"#1A1A1A","pageBackground":"#000000","secondaryAccent1":"#FF6B9D","secondaryAccent2":"#FFB800"}', true);
;
