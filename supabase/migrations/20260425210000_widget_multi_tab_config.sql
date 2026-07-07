ALTER TABLE agents_registry
  ADD COLUMN IF NOT EXISTS widget_home_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS widget_help_articles JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS widget_help_collections JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS widget_news_items JSONB NOT NULL DEFAULT '[]'::jsonb;
