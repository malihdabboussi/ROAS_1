-- ============================================================
-- ORGANIZATIONS FOUNDATION
-- Core tables for the organization layer
-- ============================================================

-- 1. Organizations
CREATE TABLE public.organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  account_type  TEXT NOT NULL DEFAULT 'team'
                CHECK (account_type IN ('team', 'agency')),
  owner_id      UUID NOT NULL REFERENCES public.profiles(id),
  avatar_url    TEXT,
  settings      JSONB DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- NOTE: "Org members can read org" policy references org_members and is defined
-- after that table is created (see below), to avoid a forward-reference error
-- on a clean database.

CREATE POLICY "Owner can update org"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create orgs"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Service role full access organizations"
  ON public.organizations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Org Members
CREATE TABLE public.org_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  role          TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('owner', 'admin', 'creator', 'editor', 'viewer')),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('active', 'suspended', 'pending')),
  invited_by    UUID REFERENCES public.profiles(id),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_user ON public.org_members(user_id);
CREATE INDEX idx_org_members_org ON public.org_members(org_id);
CREATE INDEX idx_org_members_org_status ON public.org_members(org_id, status);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Moved here from the organizations block (forward-reference fix): needs org_members to exist.
CREATE POLICY "Org members can read org"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = organizations.id
        AND org_members.user_id = auth.uid()
        AND org_members.status = 'active'
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "Members can read own membership"
  ON public.org_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members can read co-members in same org"
  ON public.org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY "Service role full access org_members"
  ON public.org_members FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Org Invitations
CREATE TABLE public.org_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'editor'
                CHECK (role IN ('admin', 'creator', 'editor', 'viewer')),
  token         TEXT UNIQUE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by    UUID NOT NULL REFERENCES public.profiles(id),
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_invitations_org ON public.org_invitations(org_id);
CREATE INDEX idx_org_invitations_email ON public.org_invitations(email);
CREATE INDEX idx_org_invitations_token ON public.org_invitations(token);

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invitee can read pending invite by email"
  ON public.org_invitations FOR SELECT
  USING (
    status = 'pending'
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "Org admins can manage invitations"
  ON public.org_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_invitations.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role full access org_invitations"
  ON public.org_invitations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Org Brain Sharing
CREATE TABLE public.org_brain_sharing (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brain_id      UUID NOT NULL REFERENCES public.ns_brains(id) ON DELETE CASCADE,
  permission    TEXT NOT NULL DEFAULT 'query'
                CHECK (permission IN ('view', 'query')),
  shared_by     UUID NOT NULL REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, brain_id)
);

ALTER TABLE public.org_brain_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read shared brains"
  ON public.org_brain_sharing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_brain_sharing.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY "Brain owner can manage sharing"
  ON public.org_brain_sharing FOR ALL
  USING (shared_by = auth.uid())
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Service role full access org_brain_sharing"
  ON public.org_brain_sharing FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. Org Subscriptions
CREATE TABLE public.org_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 UUID UNIQUE NOT NULL REFERENCES public.organizations(id),
  plan_id                UUID REFERENCES public.subscription_plans(id),
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'active',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN DEFAULT false,
  canceled_at            TIMESTAMPTZ,
  discount_percent       INTEGER,
  discount_stripe_coupon_id TEXT,
  discount_end_date      TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owner can manage subscription"
  ON public.org_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_subscriptions.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = 'owner'
    )
  );

CREATE POLICY "Org members can read subscription"
  ON public.org_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_subscriptions.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY "Service role full access org_subscriptions"
  ON public.org_subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER set_updated_at_org_subscriptions
  BEFORE UPDATE ON public.org_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Org Monthly Credit Usage
CREATE TABLE public.org_monthly_credit_usage (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES public.organizations(id),
  month                   DATE NOT NULL,
  base_allowance          INTEGER NOT NULL DEFAULT 0,
  base_credits_used       INTEGER NOT NULL DEFAULT 0,
  purchased_credits_used  INTEGER NOT NULL DEFAULT 0,
  total_credits_used      INTEGER NOT NULL DEFAULT 0,
  total_credits_purchased INTEGER NOT NULL DEFAULT 0,
  rollover_credits        INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, month)
);

ALTER TABLE public.org_monthly_credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can read usage"
  ON public.org_monthly_credit_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_monthly_credit_usage.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role full access org_monthly_credit_usage"
  ON public.org_monthly_credit_usage FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER set_updated_at_org_monthly_credit_usage
  BEFORE UPDATE ON public.org_monthly_credit_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Org Credit Purchases
CREATE TABLE public.org_credit_purchases (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID NOT NULL REFERENCES public.organizations(id),
  credits_purchased           INTEGER NOT NULL,
  amount_paid                 INTEGER NOT NULL,
  purchased_by                UUID NOT NULL REFERENCES public.profiles(id),
  stripe_payment_intent_id    TEXT,
  stripe_checkout_session_id  TEXT,
  status                      TEXT DEFAULT 'completed',
  created_at                  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.org_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owner can manage purchases"
  ON public.org_credit_purchases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_credit_purchases.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = 'owner'
    )
  );

CREATE POLICY "Service role full access org_credit_purchases"
  ON public.org_credit_purchases FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 8. Org Member Credit Limits
CREATE TABLE public.org_member_credit_limits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  member_id       UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  period          TEXT NOT NULL DEFAULT 'monthly'
                  CHECK (period IN ('daily', 'weekly', 'monthly', 'uncapped')),
  credit_limit    NUMERIC,
  credits_used    NUMERIC NOT NULL DEFAULT 0,
  period_start    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, member_id)
);

ALTER TABLE public.org_member_credit_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage limits"
  ON public.org_member_credit_limits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_member_credit_limits.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can read own limits"
  ON public.org_member_credit_limits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.id = org_member_credit_limits.member_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access org_member_credit_limits"
  ON public.org_member_credit_limits FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER set_updated_at_org_member_credit_limits
  BEFORE UPDATE ON public.org_member_credit_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. Org Credit Auto Recharge
CREATE TABLE public.org_credit_auto_recharge (
  org_id                 UUID PRIMARY KEY REFERENCES public.organizations(id),
  is_enabled             BOOLEAN NOT NULL DEFAULT false,
  threshold_credits      INTEGER NOT NULL DEFAULT 100,
  recharge_amount        INTEGER NOT NULL DEFAULT 500,
  max_monthly_recharges  INTEGER NOT NULL DEFAULT 3,
  updated_at             TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.org_credit_auto_recharge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owner can manage auto recharge"
  ON public.org_credit_auto_recharge FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_credit_auto_recharge.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = 'owner'
    )
  );

CREATE POLICY "Service role full access org_credit_auto_recharge"
  ON public.org_credit_auto_recharge FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER set_updated_at_org_credit_auto_recharge
  BEFORE UPDATE ON public.org_credit_auto_recharge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. Org Addons
CREATE TABLE public.org_addons (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                       UUID NOT NULL REFERENCES public.organizations(id),
  addon_slug                   TEXT NOT NULL,
  stripe_subscription_item_id  TEXT,
  brain_id                     UUID REFERENCES public.ns_brains(id),
  agent_id                     TEXT NOT NULL,
  status                       TEXT NOT NULL DEFAULT 'active',
  created_at                   TIMESTAMPTZ DEFAULT now(),
  canceled_at                  TIMESTAMPTZ
);

ALTER TABLE public.org_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owner can manage addons"
  ON public.org_addons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_addons.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = 'owner'
    )
  );

CREATE POLICY "Service role full access org_addons"
  ON public.org_addons FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
