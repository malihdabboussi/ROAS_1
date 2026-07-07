INSERT INTO integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES (
  'stripe',
  'stripe',
  'Stripe',
  'Connect your Stripe account to manage products, prices, payment links, refunds, and revenue analytics.',
  'oauth2',
  true,
  jsonb_build_object(
    'scopes', jsonb_build_array('read_write')
  )
)
ON CONFLICT (id) DO UPDATE
SET
  provider = EXCLUDED.provider,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata,
  updated_at = now();;
