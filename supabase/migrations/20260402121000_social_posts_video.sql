-- Social posts: optional video URL + media library asset (parallel to ads.image_asset_id / ads.video_url)
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.social_posts.video_url IS 'Public URL for video media (reels, stories, or attached clip)';
COMMENT ON COLUMN public.social_posts.video_asset_id IS 'FK to media_assets when video comes from the media library';
