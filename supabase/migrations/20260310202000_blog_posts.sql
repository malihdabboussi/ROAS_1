-- Blog posts for website funnels.

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_id uuid NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  excerpt text,
  cover_image text,
  author text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funnel_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_funnel ON blog_posts(funnel_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_funnel_status ON blog_posts(funnel_id, status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_campaign ON blog_posts(campaign_id);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blog_posts_read_own ON blog_posts;
CREATE POLICY blog_posts_read_own ON blog_posts
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS blog_posts_write_own ON blog_posts;
CREATE POLICY blog_posts_write_own ON blog_posts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_blog_posts ON blog_posts;
CREATE TRIGGER set_updated_at_blog_posts
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
