-- Waitlist entries, invite codes (hashed), platform transactional email config, atomic redeem RPC

CREATE TABLE waitlist_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'invited', 'registered', 'declined')),
  source      TEXT,
  notes       TEXT,
  invited_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE waitlist_invites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_entry_id UUID NOT NULL REFERENCES waitlist_entries(id) ON DELETE CASCADE,
  email_normalized  TEXT NOT NULL,
  code_hash         TEXT NOT NULL UNIQUE,
  sent_at           TIMESTAMPTZ,
  sent_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at       TIMESTAMPTZ,
  redeemed_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_waitlist_invites_redeemed_user
  ON waitlist_invites(redeemed_user_id)
  WHERE redeemed_user_id IS NOT NULL;

CREATE INDEX idx_waitlist_entries_status ON waitlist_entries(status);
CREATE INDEX idx_waitlist_entries_created ON waitlist_entries(created_at DESC);
CREATE INDEX idx_waitlist_invites_entry ON waitlist_invites(waitlist_entry_id);
CREATE INDEX idx_waitlist_invites_code_hash ON waitlist_invites(code_hash);
CREATE INDEX idx_waitlist_invites_email ON waitlist_invites(email_normalized);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full" ON waitlist_entries FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON waitlist_invites FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_waitlist_entries_updated_at
  BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_waitlist_invites_updated_at
  BEFORE UPDATE ON waitlist_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE platform_email_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain              TEXT,
  subdomain           TEXT,
  sendgrid_domain_id  BIGINT,
  domain_status       TEXT DEFAULT 'pending'
                        CHECK (domain_status IN ('pending', 'verifying', 'verified', 'failed')),
  dns_records         JSONB DEFAULT '[]'::jsonb,
  domain_verified_at  TIMESTAMPTZ,
  sender_email        TEXT,
  sender_name         TEXT,
  sendgrid_sender_id  BIGINT,
  sender_verified     BOOLEAN NOT NULL DEFAULT false,
  reply_to_email      TEXT,
  address             TEXT,
  city                TEXT,
  country             TEXT,
  configured_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_email_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full" ON platform_email_config FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_platform_email_config_updated_at
  BEFORE UPDATE ON platform_email_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION redeem_invite_code(
  p_code_hash TEXT,
  p_email     TEXT,
  p_user_id   UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id UUID;
  v_entry_id UUID;
BEGIN
  UPDATE waitlist_invites
  SET redeemed_at = now(), redeemed_user_id = p_user_id
  WHERE code_hash = p_code_hash
    AND email_normalized = p_email
    AND redeemed_at IS NULL
  RETURNING id, waitlist_entry_id INTO v_invite_id, v_entry_id;

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_redeemed_code';
  END IF;

  UPDATE waitlist_entries
  SET status = 'registered', updated_at = now()
  WHERE id = v_entry_id;

  RETURN v_invite_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invite_code(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(TEXT, TEXT, UUID) TO service_role;
