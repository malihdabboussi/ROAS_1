-- Keep one pending org invitation per email address.

WITH ranked_pending_invitations AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY org_id, lower(email)
      ORDER BY created_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.org_invitations
  WHERE status = 'pending'
)
UPDATE public.org_invitations invitation
SET status = 'revoked'
FROM ranked_pending_invitations ranked
WHERE invitation.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invitations_pending_org_email_unique
  ON public.org_invitations (org_id, lower(email))
  WHERE status = 'pending';
