-- ============================================================
-- Standardize channel_memberships.role to canonical (admin | edit | view).
--   admin  -> admin   (manage channel + post + read)
--   member -> edit    (post + read)
--   view   -> view    (read only — NEW)
-- Default flips from 'member' to 'edit'.
-- ============================================================

BEGIN;

-- 1) Relax CHECK to accept both legacy + canonical values during data swap.
ALTER TABLE public.channel_memberships
  DROP CONSTRAINT IF EXISTS channel_memberships_role_check;
ALTER TABLE public.channel_memberships
  ADD CONSTRAINT channel_memberships_role_check
  CHECK (role IN ('admin', 'edit', 'view', 'member'));

-- 2) Migrate legacy rows.
UPDATE public.channel_memberships SET role = 'edit' WHERE role = 'member';

-- 3) Tighten CHECK + flip default.
ALTER TABLE public.channel_memberships
  ALTER COLUMN role SET DEFAULT 'edit';

ALTER TABLE public.channel_memberships
  DROP CONSTRAINT channel_memberships_role_check;
ALTER TABLE public.channel_memberships
  ADD CONSTRAINT channel_memberships_role_check
  CHECK (role IN ('admin', 'edit', 'view'));

-- 4) Update is_channel_admin policies-side function to keep semantics
--    (no behavior change — admin still means manage). Refresh comment only.
COMMENT ON FUNCTION public.is_channel_admin(UUID) IS
  'TRUE when caller is a member of the channel with role = admin (canonical share level).';

COMMIT;
