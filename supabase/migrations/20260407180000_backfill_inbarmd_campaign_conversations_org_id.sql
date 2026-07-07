-- InbarMD campaign + conversations were created with org_id NULL (personal scope).
-- Both org members share organization InbarMD (ffb7247d-7ac5-45a0-8503-bfc939f4c617) but RLS + listConversations(findByOrg)
-- only return rows where org_id matches; peers could not see each other's threads.
-- Target: campaign id e556404a-488e-4748-ad09-645fbb9d1b57 (name InbarMD in prod).

UPDATE public.campaigns
SET org_id = 'ffb7247d-7ac5-45a0-8503-bfc939f4c617'
WHERE id = 'e556404a-488e-4748-ad09-645fbb9d1b57'
  AND org_id IS NULL;

UPDATE public.conversations
SET org_id = 'ffb7247d-7ac5-45a0-8503-bfc939f4c617'
WHERE campaign_id = 'e556404a-488e-4748-ad09-645fbb9d1b57'
  AND org_id IS NULL;
