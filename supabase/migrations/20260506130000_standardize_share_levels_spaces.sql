-- ============================================================
-- Standardize space share levels to canonical (admin | edit | view).
--   full_edit -> admin
--   comment   -> view
--   edit      -> edit
--   view      -> view
-- Applies to space_shares + space_item_shares.
-- ============================================================

BEGIN;

-- 1) Relax CHECK to accept both legacy + canonical values during data swap.
ALTER TABLE public.space_shares
  DROP CONSTRAINT IF EXISTS space_shares_level_check;
ALTER TABLE public.space_shares
  ADD CONSTRAINT space_shares_level_check
  CHECK (level IN ('admin', 'edit', 'view', 'full_edit', 'comment'));

ALTER TABLE public.space_item_shares
  DROP CONSTRAINT IF EXISTS space_item_shares_level_check;
ALTER TABLE public.space_item_shares
  ADD CONSTRAINT space_item_shares_level_check
  CHECK (level IN ('admin', 'edit', 'view', 'full_edit', 'comment'));

-- 2) Migrate existing rows.
UPDATE public.space_shares       SET level = 'admin' WHERE level = 'full_edit';
UPDATE public.space_shares       SET level = 'view'  WHERE level = 'comment';
UPDATE public.space_item_shares  SET level = 'admin' WHERE level = 'full_edit';
UPDATE public.space_item_shares  SET level = 'view'  WHERE level = 'comment';

-- 3) Tighten CHECK to canonical only.
ALTER TABLE public.space_shares
  DROP CONSTRAINT space_shares_level_check;
ALTER TABLE public.space_shares
  ADD CONSTRAINT space_shares_level_check
  CHECK (level IN ('admin', 'edit', 'view'));

ALTER TABLE public.space_item_shares
  DROP CONSTRAINT space_item_shares_level_check;
ALTER TABLE public.space_item_shares
  ADD CONSTRAINT space_item_shares_level_check
  CHECK (level IN ('admin', 'edit', 'view'));

COMMIT;
