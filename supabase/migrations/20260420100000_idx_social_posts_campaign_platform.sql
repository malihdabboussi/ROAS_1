-- Index to support SocialInsightsService.listPublishedPosts:
--   SELECT ... FROM social_posts
--   WHERE campaign_id = ? AND platform = ? AND published_id IS NOT NULL
--   ORDER BY published_at DESC
--
-- Previously only pkey + partial org_id index existed on social_posts, so this
-- query required a seq scan filtered by campaign_id. It runs twice per main
-- dashboard request (IG + LinkedIn), so the seq scan cost compounds.

CREATE INDEX IF NOT EXISTS idx_social_posts_campaign_platform_published
  ON public.social_posts (campaign_id, platform, published_at DESC)
  WHERE published_id IS NOT NULL;
