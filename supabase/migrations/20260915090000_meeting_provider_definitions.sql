-- Note takers defined from Settings › Integrations › More integrations (ROA-51).
-- A definition is data that fully describes a push-only meeting provider:
-- how it signs deliveries, which event to accept, and where each meeting
-- field lives in its JSON. The API builds a provider from it per request.

CREATE TABLE IF NOT EXISTS public.meeting_provider_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^nt_[a-z0-9_]{2,40}$'),
  display_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  signature JSONB NOT NULL,
  event JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_map JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_provider_definitions_active
  ON public.meeting_provider_definitions (is_active, display_name);

ALTER TABLE public.meeting_provider_definitions ENABLE ROW LEVEL SECURITY;
-- Service role only: the API reads and writes; writes are gated by the
-- platform admin role in the API (RoleGuard). No user policies on purpose.

DROP TRIGGER IF EXISTS set_updated_at_meeting_provider_definitions ON public.meeting_provider_definitions;
CREATE TRIGGER set_updated_at_meeting_provider_definitions
  BEFORE UPDATE ON public.meeting_provider_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- `user_integrations.integration_id` references `integrations_available(id)`;
-- the API upserts one catalog row per definition (id = slug). Nothing to seed.
