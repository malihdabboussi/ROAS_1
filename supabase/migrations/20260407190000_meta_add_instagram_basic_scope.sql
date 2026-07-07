-- Sync integrations_available metadata with actual OAuth scopes in meta.integration.ts
-- Adds pages_manage_ads, public_profile which were in code but missing from DB metadata
UPDATE integrations_available
SET metadata = jsonb_set(
  metadata,
  '{scopes}',
  '["ads_management","ads_read","pages_manage_ads","pages_read_engagement","pages_show_list","business_management","public_profile"]'::jsonb
),
updated_at = now()
WHERE id = 'meta';
