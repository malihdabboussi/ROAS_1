-- PayPal legacy OAuth integration (Log in with PayPal)

INSERT INTO integrations_available (id, provider, name, description, auth_type, is_available, metadata)
VALUES (
  'paypal',
  'paypal',
  'PayPal',
  'Connect PayPal to view transactions, payments, refunds, and account balance.',
  'oauth2',
  true,
  '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata;
