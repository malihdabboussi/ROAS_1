-- The ROAS organization owner profile still uses the legacy test email, so
-- scope the known-team repair to the durable ROAS organization id.

UPDATE public.channel_members
SET
  relationship_kind = 'internal',
  relationship_source = 'manual',
  updated_at = now()
WHERE platform = 'slack'
  AND org_id = 'f69bd799-3509-41b4-aaef-98f03c48c295'::uuid
  AND (
    lower(display_name) LIKE 'james anderson%'
    OR lower(display_name) LIKE 'nefi blanco%'
  );
