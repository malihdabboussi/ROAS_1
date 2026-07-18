BEGIN;

-- Refresh only hired copies that still match the prior library body.
UPDATE public.agent_skills AS skill
SET
  description = $description$Pulls observed competitor ads through platform-managed Ads Intelligence and Social Analysis, then builds or updates the campaign Theme from verified website, logo, social, and media evidence. Use for market research, competitor or ad-library research, campaign brand setup, or before writing ads for a new campaign. Produces WEB#4 research plus the active Theme consumed by ads, funnels, decks, and image generation. Do not use it to write creative.$description$,
  markdown_content = replace(
    skill.markdown_content,
    E'## THE WORKFLOW\n',
    E'## THE WORKFLOW\n\n### Step 0 — Complete the campaign Theme\nDo this in the same research run so design never starts from an empty brand shell.\n\n1. Call `list_campaign_media` and inspect available logo files, product imagery, team headshots, and design references. Read the client website and known social profiles from campaign and Brain context.\n2. Call `list_themes`. If a campaign Theme is active, preserve verified user-entered values. If none is active, prepare one named for the client.\n3. When a website URL is available, call `extract_website_theme` with `url`. Treat extraction as evidence, not permission to overwrite stronger uploaded or user-confirmed values.\n4. Map evidence into the flat Theme fields: `colors`, `font_heading`, `font_body`, `logo_asset_id`, `brand_voice`, `brand_values`, `social_links`, `design_settings`, `headshot_images`, `product_images`, and `image_style_prompt`.\n5. Call `update_theme` for the active Theme or `create_theme` with `campaign_id` when none exists. The campaign must finish this step with one active Theme.\n6. Add a Brand Evidence Ledger to the research Doc. For every Theme field, record its source and exactly one status: `confirmed`, `inferred`, or `not found`. Never silently skip a field, invent an asset ID, or replace confirmed data with inference.\n'
  ),
  updated_at = now()
FROM public.skill_library AS library
WHERE skill.skill_key = 'roas-market-research'
  AND library.skill_key = skill.skill_key
  AND skill.source IN ('template', 'system', 'default')
  AND skill.markdown_content = library.markdown_content
  AND skill.markdown_content NOT LIKE '%### Step 0 — Complete the campaign Theme%';

UPDATE public.skill_library
SET
  description = $description$Pulls observed competitor ads through platform-managed Ads Intelligence and Social Analysis, then builds or updates the campaign Theme from verified website, logo, social, and media evidence. Use for market research, competitor or ad-library research, campaign brand setup, or before writing ads for a new campaign. Produces WEB#4 research plus the active Theme consumed by ads, funnels, decks, and image generation. Do not use it to write creative.$description$,
  markdown_content = replace(
    markdown_content,
    E'## THE WORKFLOW\n',
    E'## THE WORKFLOW\n\n### Step 0 — Complete the campaign Theme\nDo this in the same research run so design never starts from an empty brand shell.\n\n1. Call `list_campaign_media` and inspect available logo files, product imagery, team headshots, and design references. Read the client website and known social profiles from campaign and Brain context.\n2. Call `list_themes`. If a campaign Theme is active, preserve verified user-entered values. If none is active, prepare one named for the client.\n3. When a website URL is available, call `extract_website_theme` with `url`. Treat extraction as evidence, not permission to overwrite stronger uploaded or user-confirmed values.\n4. Map evidence into the flat Theme fields: `colors`, `font_heading`, `font_body`, `logo_asset_id`, `brand_voice`, `brand_values`, `social_links`, `design_settings`, `headshot_images`, `product_images`, and `image_style_prompt`.\n5. Call `update_theme` for the active Theme or `create_theme` with `campaign_id` when none exists. The campaign must finish this step with one active Theme.\n6. Add a Brand Evidence Ledger to the research Doc. For every Theme field, record its source and exactly one status: `confirmed`, `inferred`, or `not found`. Never silently skip a field, invent an asset ID, or replace confirmed data with inference.\n'
  ),
  updated_at = now()
WHERE skill_key = 'roas-market-research'
  AND markdown_content NOT LIKE '%### Step 0 — Complete the campaign Theme%';

COMMIT;
