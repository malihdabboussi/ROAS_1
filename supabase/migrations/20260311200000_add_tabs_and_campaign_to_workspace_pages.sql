-- Add tabs system and campaign link to workspace_pages

-- Add tabs column (replaces layout as the source of truth for widget placement)
ALTER TABLE workspace_pages
  ADD COLUMN IF NOT EXISTS tabs JSONB DEFAULT '[]'::jsonb;

-- Add campaign_id to link a page to a campaign
ALTER TABLE workspace_pages
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_pages_campaign ON workspace_pages(campaign_id);

-- Migrate existing layout data into the first tab for pages that have layout data
UPDATE workspace_pages
SET tabs = jsonb_build_array(
  jsonb_build_object(
    'id', 'default',
    'title', 'Dashboard',
    'icon', 'layout-dashboard',
    'layout', COALESCE(layout, '[]'::jsonb)
  )
)
WHERE layout IS NOT NULL
  AND jsonb_array_length(COALESCE(layout, '[]'::jsonb)) > 0
  AND (tabs IS NULL OR jsonb_array_length(tabs) = 0);

-- For pages with no layout, initialize with one empty default tab
UPDATE workspace_pages
SET tabs = jsonb_build_array(
  jsonb_build_object(
    'id', 'default',
    'title', 'Dashboard',
    'icon', 'layout-dashboard',
    'layout', '[]'::jsonb
  )
)
WHERE tabs IS NULL OR jsonb_array_length(tabs) = 0;
