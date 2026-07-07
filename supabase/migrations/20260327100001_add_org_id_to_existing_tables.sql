-- ============================================================
-- ADD org_id TO EXISTING TABLES
-- Nullable column -- NULL means personal context
-- ============================================================

-- Campaign ecosystem
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.sequences ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- Agent ecosystem
ALTER TABLE public.agents_registry ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.agent_skills ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.agent_skill_resources ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.agent_definitions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.agent_workflows ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.agent_channels ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.user_agent_state ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- Brain / Knowledge
ALTER TABLE public.ns_brains ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.brain_import_jobs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- CRM
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.contact_tags ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.contact_custom_field_definitions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.segments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- Infrastructure
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.branding_themes ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.email_domains ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.email_sender_identities ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.user_integrations ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.vault_secrets ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.github_repos ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- Workspace / Projects
ALTER TABLE public.user_workspaces ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.project_repos ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- Custom objects
ALTER TABLE public.user_object_types ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.user_object_records ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- Observability / Billing tracking
ALTER TABLE public.ai_usage_events ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.vb_agent_traces ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- API keys (schema readiness, UI deferred)
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- Notifications
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- ============================================================
-- INDEXES on org_id for frequently queried tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON public.campaigns(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_registry_org ON public.agents_registry(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ns_brains_org ON public.ns_brains(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_missions_org ON public.missions(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_org ON public.media_assets(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnels_org ON public.funnels(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_org ON public.offers(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_org ON public.ai_usage_events(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_domains_org ON public.domains(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_integrations_org ON public.user_integrations(org_id) WHERE org_id IS NOT NULL;

-- ============================================================
-- PARTIAL UNIQUE INDEXES for agents_registry
-- Same agent_key can exist in personal AND org contexts
-- ============================================================
ALTER TABLE public.agents_registry DROP CONSTRAINT IF EXISTS agents_registry_user_id_agent_key_key;

CREATE UNIQUE INDEX idx_agents_registry_personal_unique
  ON public.agents_registry(user_id, agent_key)
  WHERE org_id IS NULL;

CREATE UNIQUE INDEX idx_agents_registry_org_unique
  ON public.agents_registry(org_id, agent_key)
  WHERE org_id IS NOT NULL;
