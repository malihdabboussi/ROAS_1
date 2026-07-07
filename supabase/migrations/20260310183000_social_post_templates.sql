CREATE TABLE IF NOT EXISTS social_post_templates (
  id SERIAL PRIMARY KEY,
  template_name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'linkedin',
  post_type TEXT NOT NULL DEFAULT 'Posts',
  template_category TEXT NOT NULL,
  full_template TEXT NOT NULL,
  hook_template TEXT,
  main_content_template TEXT,
  cta_template TEXT,
  half_template_version TEXT,
  template_variables TEXT,
  use_cases TEXT,
  example_output TEXT,
  performance_rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spt_platform_category ON social_post_templates(platform, template_category);

-- 49 LinkedIn templates seeded via REST API from CSV import.
-- See: docker/agents/vibey/examples/social-posts/INDEX.md for the full template catalog.
