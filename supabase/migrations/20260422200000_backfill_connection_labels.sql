-- Backfill connection_label from existing metadata for legacy providers
-- that already store identity data but never populated connection_label.

-- PayPal: metadata.email
UPDATE public.user_integrations
SET connection_label = metadata->>'email',
    updated_at = now()
WHERE connection_label IS NULL
  AND integration_id = 'paypal'
  AND metadata->>'email' IS NOT NULL
  AND (metadata->>'email') != '';

-- Dropbox: metadata.email or metadata.display_name
UPDATE public.user_integrations
SET connection_label = COALESCE(metadata->>'email', metadata->>'display_name'),
    updated_at = now()
WHERE connection_label IS NULL
  AND integration_id = 'dropbox'
  AND COALESCE(metadata->>'email', metadata->>'display_name') IS NOT NULL;

-- Calendly: metadata.calendly_user_email
UPDATE public.user_integrations
SET connection_label = metadata->>'calendly_user_email',
    updated_at = now()
WHERE connection_label IS NULL
  AND integration_id = 'calendly'
  AND metadata->>'calendly_user_email' IS NOT NULL
  AND (metadata->>'calendly_user_email') != '';

-- Fireflies: metadata.email or metadata.name
UPDATE public.user_integrations
SET connection_label = COALESCE(metadata->>'email', metadata->>'name'),
    updated_at = now()
WHERE connection_label IS NULL
  AND integration_id = 'fireflies'
  AND COALESCE(metadata->>'email', metadata->>'name') IS NOT NULL;

-- Meta: first Instagram username or first page name
UPDATE public.user_integrations
SET connection_label = COALESCE(
  '@' || (metadata->'pages'->0->'instagram_business_account'->>'username'),
  metadata->'pages'->0->>'name'
),
    updated_at = now()
WHERE connection_label IS NULL
  AND integration_id = 'meta'
  AND metadata->'pages' IS NOT NULL
  AND jsonb_array_length(metadata->'pages') > 0
  AND COALESCE(
    metadata->'pages'->0->'instagram_business_account'->>'username',
    metadata->'pages'->0->>'name'
  ) IS NOT NULL;

-- Stripe: metadata.stripe_user_id
UPDATE public.user_integrations
SET connection_label = metadata->>'stripe_user_id',
    updated_at = now()
WHERE connection_label IS NULL
  AND integration_id = 'stripe'
  AND metadata->>'stripe_user_id' IS NOT NULL
  AND (metadata->>'stripe_user_id') != '';

-- GitHub: metadata.installation_id
UPDATE public.user_integrations
SET connection_label = 'Installation #' || (metadata->>'installation_id'),
    updated_at = now()
WHERE connection_label IS NULL
  AND integration_id = 'github'
  AND metadata->>'installation_id' IS NOT NULL;

-- GoHighLevel: metadata.companyId or metadata.locationId
UPDATE public.user_integrations
SET connection_label = COALESCE(metadata->>'companyId', metadata->>'locationId'),
    updated_at = now()
WHERE connection_label IS NULL
  AND integration_id = 'gohighlevel'
  AND COALESCE(metadata->>'companyId', metadata->>'locationId') IS NOT NULL;

-- Generic fallback: any row with metadata.email that still has no label
UPDATE public.user_integrations
SET connection_label = metadata->>'email',
    updated_at = now()
WHERE connection_label IS NULL
  AND metadata->>'email' IS NOT NULL
  AND (metadata->>'email') != '';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
