-- Add social_links column to branding_themes for storing social media handles
ALTER TABLE public.branding_themes
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';
