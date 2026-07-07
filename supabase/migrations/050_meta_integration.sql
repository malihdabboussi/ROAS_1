-- Add Meta (Facebook) to integrations_available catalog
INSERT INTO integrations_available (id, provider, name, description, auth_type, is_available, metadata)
VALUES (
  'meta',
  'meta',
  'Meta Ads',
  'Connect your Meta (Facebook/Instagram) ad account to publish ads directly from Vibey.',
  'oauth2',
  true,
  '{"scopes": ["ads_management", "ads_read", "pages_read_engagement", "pages_show_list", "business_management"], "icon": "meta"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
