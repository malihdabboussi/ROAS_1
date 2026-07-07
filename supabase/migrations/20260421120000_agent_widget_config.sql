ALTER TABLE agents_registry
  ADD COLUMN IF NOT EXISTS widget_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS widget_title TEXT,
  ADD COLUMN IF NOT EXISTS widget_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS widget_greeting TEXT,
  ADD COLUMN IF NOT EXISTS widget_accent_color TEXT,
  ADD COLUMN IF NOT EXISTS widget_launcher_icon_url TEXT,
  ADD COLUMN IF NOT EXISTS widget_position TEXT NOT NULL DEFAULT 'bottom-right',
  ADD COLUMN IF NOT EXISTS widget_allowed_origins TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE agents_registry
  DROP CONSTRAINT IF EXISTS agents_registry_widget_position_check;

ALTER TABLE agents_registry
  ADD CONSTRAINT agents_registry_widget_position_check
  CHECK (widget_position IN ('bottom-right', 'bottom-left'));

DROP POLICY IF EXISTS "public_agents_readable" ON agents_registry;

CREATE POLICY "public_agents_readable" ON agents_registry
  FOR SELECT USING (public_page_enabled = true OR widget_enabled = true);
