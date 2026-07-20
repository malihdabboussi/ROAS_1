-- Turn Slack identities into admin-managed people without silently merging User Brains.

ALTER TABLE public.channel_members
  ADD COLUMN IF NOT EXISTS relationship_source text NOT NULL DEFAULT 'inferred',
  ADD COLUMN IF NOT EXISTS suggested_vibey_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS identity_match_method text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS identity_match_confidence numeric NOT NULL DEFAULT 0;

-- Widen the constraint before converting legacy rows so the migration is valid
-- in environments whose existing check only accepts team_member/external/unknown.
ALTER TABLE public.channel_members
  DROP CONSTRAINT IF EXISTS channel_members_relationship_kind_check,
  ADD CONSTRAINT channel_members_relationship_kind_check
    CHECK (relationship_kind IN ('internal', 'external', 'ignored', 'team_member', 'unknown'));

UPDATE public.channel_members
SET relationship_kind = CASE relationship_kind
      WHEN 'team_member' THEN 'internal'
      WHEN 'unknown' THEN 'internal'
      ELSE relationship_kind
    END,
    relationship_source = 'inferred'
WHERE platform = 'slack';

ALTER TABLE public.channel_members
  DROP CONSTRAINT IF EXISTS channel_members_relationship_source_check,
  ADD CONSTRAINT channel_members_relationship_source_check
    CHECK (relationship_source IN ('inferred', 'manual')),
  DROP CONSTRAINT IF EXISTS channel_members_identity_match_method_check,
  ADD CONSTRAINT channel_members_identity_match_method_check
    CHECK (identity_match_method IN ('none', 'email', 'suggested_name', 'confirmed_name')),
  DROP CONSTRAINT IF EXISTS channel_members_identity_match_confidence_check,
  ADD CONSTRAINT channel_members_identity_match_confidence_check
    CHECK (identity_match_confidence >= 0 AND identity_match_confidence <= 1);

CREATE INDEX IF NOT EXISTS idx_channel_members_suggested_vibey_user
  ON public.channel_members (suggested_vibey_user_id)
  WHERE suggested_vibey_user_id IS NOT NULL;

COMMENT ON COLUMN public.channel_members.relationship_kind IS
  'Admin-facing person classification: internal, external, or ignored. Legacy values remain temporarily accepted for zero-downtime deploy compatibility.';
COMMENT ON COLUMN public.channel_members.suggested_vibey_user_id IS
  'Exact unique name suggestion only. Never treated as a portal identity until an admin confirms it.';

NOTIFY pgrst, 'reload schema';
