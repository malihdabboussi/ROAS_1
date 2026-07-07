-- Phase 1: Org Agent Ownership Model
-- Org agents belong to the org (user_id = NULL, org_id = <uuid>).
-- Personal agents keep user_id set and org_id NULL.

-- 0. Helper: check if user is org admin or owner
CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
  )
$$;

-- 1a. Add created_by audit column to agents_registry
ALTER TABLE public.agents_registry
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 1b. Make user_id nullable on agent tables (org agents have user_id = NULL)
ALTER TABLE public.agents_registry    ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.agent_definitions  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.agent_skills       ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.agent_skill_resources ALTER COLUMN user_id DROP NOT NULL;

-- 1c. Migrate existing org agent rows: move user_id to created_by, set user_id = NULL
UPDATE public.agents_registry
SET created_by = user_id, user_id = NULL
WHERE org_id IS NOT NULL AND user_id IS NOT NULL;

UPDATE public.agent_definitions
SET user_id = NULL
WHERE org_id IS NOT NULL AND user_id IS NOT NULL;

UPDATE public.agent_skills
SET user_id = NULL
WHERE org_id IS NOT NULL AND user_id IS NOT NULL;

UPDATE public.agent_skill_resources
SET user_id = NULL
WHERE org_id IS NOT NULL AND user_id IS NOT NULL;

-- 1d. Ensure unique constraint for org agents: (org_id, agent_key) where org_id IS NOT NULL
-- The personal unique constraint (user_id, agent_key) where org_id IS NULL already exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_registry_org_agent_unique
  ON public.agents_registry (org_id, agent_key)
  WHERE org_id IS NOT NULL;

-- 1e. Update RLS policies for the new ownership model

-- Drop existing org read policies that assumed user_id was set
DROP POLICY IF EXISTS "Org members can read org agents" ON public.agents_registry;
DROP POLICY IF EXISTS "Org members can read org agent_definitions" ON public.agent_definitions;
DROP POLICY IF EXISTS "Org members can read org agent_skills" ON public.agent_skills;
DROP POLICY IF EXISTS "Org members can read org agent_skill_resources" ON public.agent_skill_resources;

-- Org agents: any active org member can read (user_id is NULL for org agents)
CREATE POLICY "Org members read org agents"
  ON public.agents_registry FOR SELECT
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members read org agent_definitions"
  ON public.agent_definitions FOR SELECT
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members read org agent_skills"
  ON public.agent_skills FOR SELECT
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members read org agent_skill_resources"
  ON public.agent_skill_resources FOR SELECT
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id));

-- Org agents: admins and owners can modify
CREATE POLICY "Org admins manage org agents"
  ON public.agents_registry FOR ALL
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
  WITH CHECK (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id));

CREATE POLICY "Org admins manage org agent_definitions"
  ON public.agent_definitions FOR ALL
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
  WITH CHECK (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id));

CREATE POLICY "Org admins manage org agent_skills"
  ON public.agent_skills FOR ALL
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
  WITH CHECK (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id));

CREATE POLICY "Org admins manage org agent_skill_resources"
  ON public.agent_skill_resources FOR ALL
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
  WITH CHECK (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id));
