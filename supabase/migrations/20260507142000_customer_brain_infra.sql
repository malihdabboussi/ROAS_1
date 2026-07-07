-- ============================================================================
-- Customer Brain Infrastructure
-- Adds the schema foundation for an org/personal Customer Brain without changing
-- Atlas skill behavior. All changes are additive and safe to rerun.
-- ============================================================================

-- ─── Brain scope + customer counters ────────────────────────────────────────
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'user';
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS customer_memories_since_last_avatar_pass integer DEFAULT 0;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS last_avatar_synthesis_at timestamptz;

UPDATE ns_brains
SET scope = CASE
  WHEN agent_id IS NOT NULL THEN 'agent'
  WHEN campaign_id IS NOT NULL THEN 'campaign'
  ELSE 'user'
END
WHERE scope IS NULL
   OR scope = 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ns_brains_scope_check'
      AND conrelid = 'ns_brains'::regclass
  ) THEN
    ALTER TABLE ns_brains
      ADD CONSTRAINT ns_brains_scope_check
      CHECK (scope IN ('user', 'agent', 'campaign', 'customer'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ns_brains_customer_org
  ON ns_brains (org_id)
  WHERE scope = 'customer' AND org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ns_brains_customer_personal
  ON ns_brains (owner_id)
  WHERE scope = 'customer' AND org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ns_brains_scope ON ns_brains (scope);

-- ─── Customer-tagged memories ───────────────────────────────────────────────
ALTER TABLE ns_memories ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE ns_memories ADD COLUMN IF NOT EXISTS surprise_score numeric;

CREATE INDEX IF NOT EXISTS idx_ns_memories_brain_contact
  ON ns_memories (brain_id, contact_id)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ns_memories_surprise
  ON ns_memories (brain_id, surprise_score DESC)
  WHERE surprise_score IS NOT NULL;

-- ─── Contact role metadata (contact_type remains source of truth) ───────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type_source text DEFAULT 'inferred';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type_confidence numeric DEFAULT 0.5;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type_set_at timestamptz DEFAULT now();

UPDATE contacts
SET contact_type_source = COALESCE(contact_type_source, 'inferred'),
    contact_type_confidence = COALESCE(contact_type_confidence, 0.5),
    contact_type_set_at = COALESCE(contact_type_set_at, now())
WHERE contact_type_source IS NULL
   OR contact_type_confidence IS NULL
   OR contact_type_set_at IS NULL;

-- ─── Contact identifiers (multi-handle resolution) ─────────────────────────
CREATE TABLE IF NOT EXISTS contact_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind text NOT NULL,
  value text NOT NULL,
  confidence numeric NOT NULL DEFAULT 1.0,
  source text NOT NULL DEFAULT 'system',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, value)
);

CREATE INDEX IF NOT EXISTS idx_contact_identifiers_contact
  ON contact_identifiers (contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_identifiers_kind_value
  ON contact_identifiers (kind, value);

INSERT INTO contact_identifiers (contact_id, kind, value, confidence, source)
SELECT id, 'email', lower(trim(email)), 1.0, 'contacts.email'
FROM contacts
WHERE email IS NOT NULL
  AND trim(email) <> ''
ON CONFLICT (kind, value) DO NOTHING;

INSERT INTO contact_identifiers (contact_id, kind, value, confidence, source)
SELECT id, 'phone', trim(phone), 1.0, 'contacts.phone'
FROM contacts
WHERE phone IS NOT NULL
  AND trim(phone) <> ''
ON CONFLICT (kind, value) DO NOTHING;

ALTER TABLE contact_identifiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_identifiers_own ON contact_identifiers;
CREATE POLICY contact_identifiers_own ON contact_identifiers
  FOR ALL
  USING (
    contact_id IN (
      SELECT c.id
      FROM contacts c
      WHERE c.user_id = auth.uid()
         OR (c.org_id IS NOT NULL AND public.is_org_member(c.org_id))
    )
  )
  WITH CHECK (
    contact_id IN (
      SELECT c.id
      FROM contacts c
      WHERE c.user_id = auth.uid()
         OR (c.org_id IS NOT NULL AND public.is_org_member(c.org_id))
    )
  );

-- ─── Hard offer anchors on campaign memberships ────────────────────────────
ALTER TABLE contact_campaign_memberships ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES offers(id) ON DELETE SET NULL;
ALTER TABLE contact_campaign_memberships ADD COLUMN IF NOT EXISTS anchor_type text;
ALTER TABLE contact_campaign_memberships ADD COLUMN IF NOT EXISTS anchor_source text;
ALTER TABLE contact_campaign_memberships ADD COLUMN IF NOT EXISTS observed_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_contact_campaign_memberships_offer
  ON contact_campaign_memberships (offer_id)
  WHERE offer_id IS NOT NULL;

-- ─── Fathom host aliases ───────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fathom_aliases text[] DEFAULT '{}';

-- ─── Discriminator axes registry ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avatar_discriminator_axes (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  high_end_signature text,
  low_end_signature text,
  scope text NOT NULL DEFAULT 'canonical',
  org_id uuid,
  status text NOT NULL DEFAULT 'active',
  recurrence_count integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (org_id, id),
  CHECK (scope IN ('canonical', 'org-specific')),
  CHECK (status IN ('active', 'proposed', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_avatar_discriminator_axes_org_status
  ON avatar_discriminator_axes (org_id, status);

ALTER TABLE avatar_discriminator_axes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avatar_discriminator_axes_read ON avatar_discriminator_axes;
CREATE POLICY avatar_discriminator_axes_read ON avatar_discriminator_axes
  FOR SELECT
  USING (org_id IS NULL OR public.is_org_member(org_id));

DROP POLICY IF EXISTS avatar_discriminator_axes_org_write ON avatar_discriminator_axes;
CREATE POLICY avatar_discriminator_axes_org_write ON avatar_discriminator_axes
  FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

INSERT INTO avatar_discriminator_axes (
  id,
  name,
  description,
  high_end_signature,
  low_end_signature,
  scope,
  status
) VALUES
  ('stakes', 'Stakes vocabulary', 'What kind of outcomes the customer talks about.', 'revenue, team, ops, P&L', 'views, reach, algorithm', 'canonical', 'active'),
  ('horizon', 'Time horizon', 'How far ahead the customer thinks and plans.', 'this quarter, this year', 'this week, this post', 'canonical', 'active'),
  ('money', 'Money relationship', 'How the customer frames spend, risk, and return.', 'ROI-confident, multiplier-thinking', 'cautious, is it worth it', 'canonical', 'active'),
  ('reference_frame', 'Reference frame', 'Who the customer compares themselves to.', 'other businesses', 'other creators', 'canonical', 'active'),
  ('identity', 'Identity self-talk', 'How the customer describes who they are.', 'I run a business', 'I am a creator', 'canonical', 'active'),
  ('pain', 'Pain vocabulary', 'The language used for the main friction.', 'hiring, churn, P&L', 'shadowban, burnout, plateau', 'canonical', 'active'),
  ('risk', 'Risk posture', 'The customer appetite for change and uncertainty.', 'high appetite for change', 'resistant, status-quo bias', 'canonical', 'active')
ON CONFLICT (id) DO NOTHING;

-- ─── Customer avatars ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  name text NOT NULL,
  summary text,
  narrative_md text,
  status text NOT NULL DEFAULT 'emerging',
  strength numeric DEFAULT 0.1,
  confidence numeric DEFAULT 0.5,
  member_contact_ids uuid[] DEFAULT '{}',
  member_strength jsonb DEFAULT '{}',
  dominant_perspective_ids uuid[] DEFAULT '{}',
  dominant_belief_ids uuid[] DEFAULT '{}',
  dominant_pain_points text[] DEFAULT '{}',
  emotional_signature jsonb DEFAULT '{}',
  blind_spots text,
  discriminator_profile jsonb DEFAULT '{}',
  offer_ids uuid[] DEFAULT '{}',
  declared_avatar_id uuid REFERENCES avatars(id) ON DELETE SET NULL,
  contrast_profile jsonb DEFAULT '{}',
  needs_profile jsonb DEFAULT '{}',
  discriminator_questions text[] DEFAULT '{}',
  drift_metrics jsonb DEFAULT '{}',
  lineage jsonb DEFAULT '{}',
  evidence_distribution jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('emerging', 'active', 'shifting', 'transformed'))
);

CREATE INDEX IF NOT EXISTS idx_customer_avatars_brain
  ON customer_avatars (brain_id);
CREATE INDEX IF NOT EXISTS idx_customer_avatars_status
  ON customer_avatars (status);
CREATE INDEX IF NOT EXISTS idx_customer_avatars_declared
  ON customer_avatars (declared_avatar_id)
  WHERE declared_avatar_id IS NOT NULL;

ALTER TABLE customer_avatars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_avatars_own ON customer_avatars;
CREATE POLICY customer_avatars_own ON customer_avatars
  FOR ALL
  USING (
    brain_id IN (
      SELECT b.id
      FROM ns_brains b
      WHERE b.owner_id = auth.uid()
         OR (b.org_id IS NOT NULL AND public.is_org_member(b.org_id))
    )
  )
  WITH CHECK (
    brain_id IN (
      SELECT b.id
      FROM ns_brains b
      WHERE b.owner_id = auth.uid()
         OR (b.org_id IS NOT NULL AND public.is_org_member(b.org_id))
    )
  );

-- ─── Customer-side cognition metadata ──────────────────────────────────────
ALTER TABLE ns_belief_patterns ADD COLUMN IF NOT EXISTS evidence_type text DEFAULT 'stated';
ALTER TABLE ns_belief_patterns ADD COLUMN IF NOT EXISTS reinforcement_count integer DEFAULT 0;
ALTER TABLE ns_belief_patterns ADD COLUMN IF NOT EXISTS decayed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ns_belief_patterns_evidence_type_check'
      AND conrelid = 'ns_belief_patterns'::regclass
  ) THEN
    ALTER TABLE ns_belief_patterns
      ADD CONSTRAINT ns_belief_patterns_evidence_type_check
      CHECK (evidence_type IN ('stated', 'revealed', 'behavioral'));
  END IF;
END $$;

ALTER TABLE ns_perspectives ADD COLUMN IF NOT EXISTS evidence_distribution jsonb DEFAULT '{}';

CREATE OR REPLACE FUNCTION decay_customer_belief_strength(
  p_subject_ids text[],
  p_reinforced_before timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE ns_belief_patterns
  SET strength = GREATEST(COALESCE(strength, 0.1) * 0.85, 0.05),
      updated_at = now()
  WHERE subject_id = ANY(p_subject_ids)
    AND decayed_at IS NULL
    AND status IN ('emerging', 'active', 'challenged', 'transforming')
    AND COALESCE(last_reinforced_at, detected_at, created_at) < p_reinforced_before;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION remove_contact_from_customer_avatars(
  p_contact_id uuid,
  p_brain_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE customer_avatars
  SET member_contact_ids = array_remove(member_contact_ids, p_contact_id),
      updated_at = now()
  WHERE brain_id = ANY(p_brain_ids)
    AND p_contact_id = ANY(member_contact_ids);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
