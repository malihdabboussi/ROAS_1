-- ============================================================================
-- Vibey V2 — Unified Database Schema
-- ============================================================================
-- Strategy: Single Supabase project, all tables in `public` schema
-- Auth: Supabase Auth (auth.users)
-- Source repos: Vibey + The Nexus + NeuralSnap
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- profiles (from NeuralSnap ns_profiles + Vibey business_profiles)
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  company_name    TEXT,
  industry        TEXT,
  website         TEXT,
  plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'pro', 'business', 'enterprise')),
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  api_key         TEXT UNIQUE,
  onboarding_completed   BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_data        JSONB DEFAULT '{}'::jsonb,
  preferences            JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- BRAIN TABLES (from NeuralSnap)
-- ============================================================================

-- brains — knowledge containers
CREATE TABLE brains (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'My Brain',
  description     TEXT,
  snapshot_count  INT NOT NULL DEFAULT 0,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- snapshots — 16-field knowledge crystals
CREATE TABLE snapshots (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brain_id           UUID NOT NULL REFERENCES brains(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  type               TEXT CHECK (type IN ('Model', 'Rule', 'Conviction', 'Principle')),
  core               TEXT NOT NULL,
  one_liner          TEXT,
  story              TEXT,
  moment             TEXT,
  emotion            JSONB,        -- {primary, intensity}
  source             TEXT,
  trigger_pattern    TEXT,
  method             TEXT,
  steps              TEXT,
  filter             TEXT,
  challenge          TEXT,
  break_test         TEXT,
  risks              TEXT,
  proof              TEXT,
  confidence         NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  significance_score NUMERIC(3,2) CHECK (significance_score >= 0 AND significance_score <= 1),
  tags               TEXT[],
  source_type        TEXT CHECK (source_type IN ('manual', 'fathom', 'fireflies', 'api', 'agent')),
  source_id          TEXT,
  embedding          vector(768),  -- Gemini text-embedding-004
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- brain_connections — external integrations feeding the brain
CREATE TABLE brain_connections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('fathom', 'fireflies', 'custom')),
  credentials     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'error')),
  last_sync_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- CAMPAIGN TABLES (from Vibey campaigns + Nexus quests)
-- ============================================================================

-- campaigns — top-level marketing campaign containers
CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  campaign_type   TEXT CHECK (campaign_type IN ('get-more-leads', 'book-more-calls', 'launch-a-webinar')),
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  goal            JSONB DEFAULT '{}'::jsonb,     -- {metric, target, deadline, why}
  config          JSONB DEFAULT '{}'::jsonb,
  metrics         JSONB DEFAULT '{}'::jsonb,     -- {visitors, leads, bookings, conversions, revenue}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- campaign_tasks — kanban tasks within campaigns
CREATE TABLE campaign_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'backlog'
                    CHECK (status IN ('backlog', 'in_progress', 'review', 'done', 'blocked')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  task_type       TEXT CHECK (task_type IN ('funnel', 'lead_magnet', 'sequence', 'offer', 'avatar', 'content')),
  resource_id     UUID,
  agent_id        TEXT,
  order_index     INT NOT NULL DEFAULT 0,
  metadata        JSONB DEFAULT '{}'::jsonb,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- campaign_plans — AI-generated execution plans
CREATE TABLE campaign_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  plan_data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  version         INT NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- MARKETING ASSET TABLES (from Vibey)
-- ============================================================================

-- offers — business offer research data
CREATE TABLE offers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id        UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name               TEXT,
  processing_status  TEXT NOT NULL DEFAULT 'step_1_pending',
  step1_data         JSONB,   -- Product & Market Analysis
  step2_data         JSONB,   -- Power Offer
  step3_data         JSONB,   -- Buyer Persona
  step4_data         JSONB,   -- ICP Analysis
  step5_data         JSONB,   -- Competitive Edge
  step6_data         JSONB,   -- Unique Mechanisms
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- avatars — customer persona profiles
CREATE TABLE avatars (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_id        UUID REFERENCES offers(id) ON DELETE SET NULL,
  name            TEXT,
  persona_data    JSONB DEFAULT '{}'::jsonb,
  avatar_type     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- domains — custom domains for funnels
CREATE TABLE domains (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain              TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'verified', 'active', 'error')),
  verification_token  TEXT,
  ssl_status          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- funnels — landing page / funnel containers
CREATE TABLE funnels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  offer_id        UUID REFERENCES offers(id) ON DELETE SET NULL,
  name            TEXT,
  funnel_type     TEXT CHECK (funnel_type IN ('lead-magnet', 'call-booking', 'webinar')),
  template_id     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
  domain_id       UUID REFERENCES domains(id) ON DELETE SET NULL,
  slug            TEXT,
  published_url   TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- funnel_pages — individual pages within a funnel
CREATE TABLE funnel_pages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_id       UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  name            TEXT,
  page_type       TEXT CHECK (page_type IN ('opt-in', 'thank-you', 'upsell')),
  sections        JSONB DEFAULT '[]'::jsonb,
  theme_config    JSONB DEFAULT '{}'::jsonb,
  order_index     INT NOT NULL DEFAULT 0,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- lead_magnets — PDF/presentation lead magnets
CREATE TABLE lead_magnets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  offer_id        UUID REFERENCES offers(id) ON DELETE SET NULL,
  name            TEXT,
  slides          JSONB DEFAULT '[]'::jsonb,
  theme_id        TEXT,
  file_url        TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'generated', 'published')),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sequences — email sequence containers
CREATE TABLE sequences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name            TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  trigger         JSONB DEFAULT '{}'::jsonb,
  config          JSONB DEFAULT '{}'::jsonb,
  metrics         JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sequence_emails — individual emails within a sequence
CREATE TABLE sequence_emails (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id     UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  subject         TEXT,
  body            TEXT,
  delay_hours     INT NOT NULL DEFAULT 0,
  order_index     INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'ready', 'sent')),
  metrics         JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- STUDIO / CHAT TABLES
-- ============================================================================

-- conversations — agent conversation threads
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title           TEXT,
  agent_id        TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- messages — chat messages in conversations
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content           TEXT,
  content_blocks    JSONB,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- conversation_documents — artifacts associated with conversations
CREATE TABLE conversation_documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  document_type     TEXT,
  title             TEXT,
  content           JSONB DEFAULT '{}'::jsonb,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            TEXT,
  resource_id       UUID,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- AGENT SYSTEM TABLES
-- ============================================================================

-- agent_configs — user agent configuration and settings
CREATE TABLE agent_configs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name               TEXT NOT NULL DEFAULT 'Vibe',
  persona            TEXT,
  model_config       JSONB DEFAULT '{}'::jsonb,
  confirmation_mode  TEXT NOT NULL DEFAULT 'ask-before-creating'
                       CHECK (confirmation_mode IN ('ask-before-creating', 'just-do-it', 'custom')),
  custom_approvals   JSONB DEFAULT '{}'::jsonb,
  skills             TEXT[] DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- agent_tasks — internal agent execution tracking
CREATE TABLE agent_tasks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID REFERENCES conversations(id) ON DELETE SET NULL,
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  task_type         TEXT CHECK (task_type IN ('classify', 'orchestrate', 'manage', 'sub_agent')),
  agent_type        TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input             JSONB DEFAULT '{}'::jsonb,
  output            JSONB DEFAULT '{}'::jsonb,
  cost              JSONB DEFAULT '{}'::jsonb,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- CRM TABLES
-- ============================================================================

-- contacts
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email           TEXT,
  first_name      TEXT,
  last_name       TEXT,
  phone           TEXT,
  tags            TEXT[] DEFAULT '{}',
  source          TEXT CHECK (source IN ('funnel', 'import', 'manual')),
  source_id       UUID,
  custom_fields   JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- audiences — contact segments for targeting
CREATE TABLE audiences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT,
  filter_rules    JSONB DEFAULT '{}'::jsonb,
  contact_count   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SYSTEM TABLES
-- ============================================================================

-- api_keys
CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  key_hash        TEXT NOT NULL,
  key_prefix      TEXT NOT NULL,
  permissions     TEXT[] DEFAULT '{}',
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- api_usage
CREATE TABLE api_usage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  method          TEXT NOT NULL,
  status_code     INT NOT NULL,
  tokens_used     INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- templates — funnel and content templates (system + user)
CREATE TABLE templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  category        TEXT CHECK (category IN ('funnel', 'lead_magnet', 'email')),
  template_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  fields_schema   JSONB DEFAULT '{}'::jsonb,
  output_schema   JSONB DEFAULT '{}'::jsonb,
  preview_url     TEXT,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- themes — visual themes for funnels and lead magnets
CREATE TABLE themes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES (Performance-Critical)
-- ============================================================================

-- Brain search
CREATE INDEX idx_snapshots_brain ON snapshots(brain_id);
CREATE INDEX idx_snapshots_type ON snapshots(type);
CREATE INDEX idx_snapshots_embedding ON snapshots USING ivfflat (embedding vector_cosine_ops);

-- Campaign navigation
CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_campaign_tasks_campaign ON campaign_tasks(campaign_id);
CREATE INDEX idx_campaign_tasks_status ON campaign_tasks(status);

-- Marketing assets
CREATE INDEX idx_funnels_campaign ON funnels(campaign_id);
CREATE INDEX idx_sequences_campaign ON sequences(campaign_id);
CREATE INDEX idx_lead_magnets_campaign ON lead_magnets(campaign_id);
CREATE INDEX idx_offers_campaign ON offers(campaign_id);

-- Chat
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- CRM
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_email ON contacts(email);

-- API
CREATE INDEX idx_api_usage_user ON api_usage(user_id);
CREATE INDEX idx_api_usage_created ON api_usage(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brains ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
-- templates and themes are readable by all (system data)

-- profiles: user owns their own row
CREATE POLICY profiles_own ON profiles
  FOR ALL USING (id = auth.uid());

-- brains: user owns brains they created
CREATE POLICY brains_own ON brains
  FOR ALL USING (owner_id = auth.uid());

-- snapshots: access via brain ownership chain
CREATE POLICY snapshots_own ON snapshots
  FOR ALL USING (
    brain_id IN (SELECT id FROM brains WHERE owner_id = auth.uid())
  );

-- brain_connections: per-profile
CREATE POLICY brain_connections_own ON brain_connections
  FOR ALL USING (profile_id = auth.uid());

-- campaigns: user_id based
CREATE POLICY campaigns_own ON campaigns
  FOR ALL USING (user_id = auth.uid());

-- campaign_tasks: via campaign ownership
CREATE POLICY campaign_tasks_own ON campaign_tasks
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
  );

-- campaign_plans: via campaign ownership
CREATE POLICY campaign_plans_own ON campaign_plans
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
  );

-- offers
CREATE POLICY offers_own ON offers
  FOR ALL USING (user_id = auth.uid());

-- avatars
CREATE POLICY avatars_own ON avatars
  FOR ALL USING (user_id = auth.uid());

-- domains
CREATE POLICY domains_own ON domains
  FOR ALL USING (user_id = auth.uid());

-- funnels
CREATE POLICY funnels_own ON funnels
  FOR ALL USING (user_id = auth.uid());

-- funnel_pages: via funnel ownership
CREATE POLICY funnel_pages_own ON funnel_pages
  FOR ALL USING (
    funnel_id IN (SELECT id FROM funnels WHERE user_id = auth.uid())
  );

-- lead_magnets
CREATE POLICY lead_magnets_own ON lead_magnets
  FOR ALL USING (user_id = auth.uid());

-- sequences
CREATE POLICY sequences_own ON sequences
  FOR ALL USING (user_id = auth.uid());

-- sequence_emails: via sequence ownership
CREATE POLICY sequence_emails_own ON sequence_emails
  FOR ALL USING (
    sequence_id IN (SELECT id FROM sequences WHERE user_id = auth.uid())
  );

-- conversations
CREATE POLICY conversations_own ON conversations
  FOR ALL USING (user_id = auth.uid());

-- messages: via conversation ownership
CREATE POLICY messages_own ON messages
  FOR ALL USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );

-- conversation_documents: via conversation ownership
CREATE POLICY conversation_documents_own ON conversation_documents
  FOR ALL USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );

-- agent_configs
CREATE POLICY agent_configs_own ON agent_configs
  FOR ALL USING (user_id = auth.uid());

-- agent_tasks: via conversation ownership (or campaign)
CREATE POLICY agent_tasks_own ON agent_tasks
  FOR ALL USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
    OR campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
  );

-- contacts
CREATE POLICY contacts_own ON contacts
  FOR ALL USING (user_id = auth.uid());

-- audiences
CREATE POLICY audiences_own ON audiences
  FOR ALL USING (user_id = auth.uid());

-- api_keys
CREATE POLICY api_keys_own ON api_keys
  FOR ALL USING (user_id = auth.uid());

-- api_usage
CREATE POLICY api_usage_own ON api_usage
  FOR ALL USING (user_id = auth.uid());

-- templates: publicly readable (system templates)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY templates_read ON templates
  FOR SELECT USING (TRUE);

-- themes: publicly readable
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY themes_read ON themes
  FOR SELECT USING (TRUE);

-- ============================================================================
-- AUTO-CREATE PROFILE + DEFAULT BRAIN ON AUTH SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url, onboarding_animation_seen)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture'
    ),
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO brains (owner_id, name, is_default)
  VALUES (NEW.id, 'My Brain', TRUE);

  INSERT INTO agent_configs (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON brains         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON snapshots      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaigns      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaign_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaign_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON offers         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON avatars        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON funnels        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON funnel_pages   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON lead_magnets   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sequences      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sequence_emails FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversations  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversation_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agent_configs  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON audiences      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON templates      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SEED DATA: System Templates
-- ============================================================================

INSERT INTO templates (name, category, template_data, fields_schema, output_schema, is_system)
VALUES
  (
    'lead-magnet-checklist',
    'funnel',
    '{
      "description": "High-converting lead magnet funnel with opt-in page and thank-you page",
      "pages": [
        {"type": "opt-in", "sections": ["hero", "pain-points", "checklist-preview", "opt-in-form", "social-proof"]},
        {"type": "thank-you", "sections": ["confirmation", "download-link", "next-steps", "upsell-teaser"]}
      ],
      "recommended_lead_magnet": "checklist",
      "conversion_goal": "email_opt_in"
    }'::jsonb,
    '{
      "required": ["business_name", "offer_name", "target_audience", "lead_magnet_title"],
      "optional": ["brand_colors", "logo_url", "testimonials"]
    }'::jsonb,
    '{
      "slots": ["headline", "subheadline", "pain_points", "checklist_items", "cta_text", "social_proof"]
    }'::jsonb,
    TRUE
  ),
  (
    'call-booking-funnel',
    'funnel',
    '{
      "description": "Strategy call booking funnel with qualification and calendar integration",
      "pages": [
        {"type": "opt-in", "sections": ["hero", "problem-agitation", "solution-preview", "qualification-form", "authority-proof"]},
        {"type": "thank-you", "sections": ["confirmation", "calendar-embed", "preparation-steps", "expectations"]}
      ],
      "recommended_integration": "calendly",
      "conversion_goal": "call_booking"
    }'::jsonb,
    '{
      "required": ["business_name", "service_name", "target_audience", "call_type"],
      "optional": ["calendly_url", "brand_colors", "case_studies"]
    }'::jsonb,
    '{
      "slots": ["headline", "problem_statement", "solution_teaser", "qualification_questions", "cta_text", "authority_markers"]
    }'::jsonb,
    TRUE
  ),
  (
    'webinar-funnel',
    'funnel',
    '{
      "description": "Webinar registration funnel with countdown and replay pages",
      "pages": [
        {"type": "opt-in", "sections": ["hero-countdown", "what-youll-learn", "speaker-bio", "registration-form", "urgency"]},
        {"type": "thank-you", "sections": ["confirmation", "add-to-calendar", "pre-webinar-content", "share-buttons"]}
      ],
      "recommended_integration": "zoom",
      "conversion_goal": "webinar_registration"
    }'::jsonb,
    '{
      "required": ["business_name", "webinar_title", "webinar_date", "target_audience", "learning_outcomes"],
      "optional": ["speaker_photo", "brand_colors", "replay_available"]
    }'::jsonb,
    '{
      "slots": ["headline", "webinar_date", "learning_points", "speaker_name", "speaker_credentials", "cta_text", "urgency_copy"]
    }'::jsonb,
    TRUE
  );
