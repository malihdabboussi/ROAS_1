ALTER TABLE agents_registry
  ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_page_token UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS public_agent_slug TEXT UNIQUE;
