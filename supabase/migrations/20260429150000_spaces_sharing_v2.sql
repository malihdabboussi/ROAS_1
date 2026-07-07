BEGIN;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS share_link_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_share_token_unique
  ON public.spaces (share_token)
  WHERE share_token IS NOT NULL;

ALTER TABLE public.space_item_shares
  DROP CONSTRAINT IF EXISTS space_item_shares_entity_type_check;

ALTER TABLE public.space_item_shares
  ADD CONSTRAINT space_item_shares_entity_type_check
  CHECK (entity_type IN ('user', 'org', 'email'));

ALTER TABLE public.space_item_shares
  ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS invited_email TEXT,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days');

CREATE UNIQUE INDEX IF NOT EXISTS idx_space_item_shares_invite_token_unique
  ON public.space_item_shares (invite_token)
  WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_space_item_shares_invited_email
  ON public.space_item_shares (invited_email)
  WHERE invited_email IS NOT NULL;

COMMIT;
