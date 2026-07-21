-- Explicit team membership kinds and canonical agency rosters.

ALTER TABLE public.agent_teams
  ADD COLUMN IF NOT EXISTS team_kind text NOT NULL DEFAULT 'mixed';

ALTER TABLE public.agent_teams
  DROP CONSTRAINT IF EXISTS agent_teams_team_kind_check;

ALTER TABLE public.agent_teams
  ADD CONSTRAINT agent_teams_team_kind_check
  CHECK (team_kind IN ('internal', 'external', 'agent', 'mixed'));

CREATE TABLE IF NOT EXISTS public.agent_team_external_members (
  team_id uuid NOT NULL REFERENCES public.agent_teams(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.channel_members(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (team_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_team_external_members_person
  ON public.agent_team_external_members(person_id);

ALTER TABLE public.agent_team_external_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_team_external_members_org_read
  ON public.agent_team_external_members;
CREATE POLICY agent_team_external_members_org_read
  ON public.agent_team_external_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agent_teams team
    WHERE team.id = agent_team_external_members.team_id
      AND team.org_id IS NOT NULL
      AND public.is_org_member(team.org_id)
  ));

DROP POLICY IF EXISTS agent_team_external_members_org_write
  ON public.agent_team_external_members;
CREATE POLICY agent_team_external_members_org_write
  ON public.agent_team_external_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.agent_teams team
    WHERE team.id = agent_team_external_members.team_id
      AND team.org_id IS NOT NULL
      AND public.is_org_admin_or_owner(team.org_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agent_teams team
    WHERE team.id = agent_team_external_members.team_id
      AND team.org_id IS NOT NULL
      AND public.is_org_admin_or_owner(team.org_id)
  ));

INSERT INTO public.agent_teams (org_id, user_id, name, color, icon, is_system, team_kind)
SELECT organization.id, NULL, 'Internal', 'purple', 'users', true, 'internal'
FROM public.organizations organization
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_teams team
  WHERE team.org_id = organization.id AND team.name = 'Internal'
);

INSERT INTO public.agent_teams (org_id, user_id, name, color, icon, is_system, team_kind)
SELECT organization.id, NULL, 'External', 'orange', 'contact', true, 'external'
FROM public.organizations organization
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_teams team
  WHERE team.org_id = organization.id AND team.name = 'External'
);

INSERT INTO public.agent_teams (org_id, user_id, name, color, icon, is_system, team_kind)
SELECT organization.id, NULL, 'Agency Agents', 'blue', 'bot', true, 'agent'
FROM public.organizations organization
WHERE NOT EXISTS (
    SELECT 1 FROM public.agent_teams team
    WHERE team.org_id = organization.id AND team.name = 'Agency Agents'
  );

INSERT INTO public.agent_teams (org_id, user_id, name, color, icon, is_system, team_kind)
SELECT DISTINCT NULL, registry.user_id, 'Agency Agents', 'blue', 'bot', true, 'agent'
FROM public.agents_registry registry
WHERE registry.org_id IS NULL AND registry.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.agent_teams team
    WHERE team.user_id = registry.user_id AND team.org_id IS NULL AND team.name = 'Agency Agents'
  );

UPDATE public.agent_teams SET team_kind = 'internal', is_system = true
WHERE name = 'Internal';

UPDATE public.agent_teams SET team_kind = 'external', is_system = true
WHERE name = 'External';

UPDATE public.agent_teams SET team_kind = 'agent', is_system = true
WHERE name = 'Agency Agents';

INSERT INTO public.agent_team_members (team_id, user_id, added_by)
SELECT team.id, member.user_id, NULL
FROM public.agent_teams team
JOIN public.org_members member
  ON member.org_id = team.org_id AND member.status = 'active'
WHERE team.team_kind = 'internal'
ON CONFLICT (team_id, user_id) DO NOTHING;

INSERT INTO public.agent_team_external_members (team_id, person_id, added_by)
SELECT team.id, person.id, NULL
FROM public.agent_teams team
JOIN public.channel_members person
  ON person.org_id = team.org_id
 AND person.platform = 'slack'
 AND person.is_bot = false
 AND person.relationship_kind = 'external'
WHERE team.team_kind = 'external'
ON CONFLICT (team_id, person_id) DO NOTHING;

UPDATE public.agents_registry registry
SET team_id = team.id
FROM public.agent_teams team
WHERE registry.agent_key IN ('vibey', 'atlas', 'reed', 'blaze', 'ivy', 'lux', 'jaime')
  AND team.team_kind = 'agent'
  AND team.name = 'Agency Agents'
  AND (
    (registry.org_id IS NOT NULL AND team.org_id = registry.org_id AND team.user_id IS NULL)
    OR
    (registry.org_id IS NULL AND registry.user_id = team.user_id AND team.org_id IS NULL)
  );

CREATE OR REPLACE FUNCTION public.sync_canonical_internal_team_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  canonical_team_id uuid;
  target_org_id uuid;
  target_user_id uuid;
BEGIN
  target_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.org_id ELSE NEW.org_id END;
  target_user_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;

  SELECT id INTO canonical_team_id
  FROM public.agent_teams
  WHERE org_id = target_org_id AND team_kind = 'internal' AND name = 'Internal'
  LIMIT 1;

  IF canonical_team_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP <> 'DELETE' AND NEW.status = 'active' THEN
    INSERT INTO public.agent_team_members (team_id, user_id, added_by)
    VALUES (canonical_team_id, NEW.user_id, NULL)
    ON CONFLICT (team_id, user_id) DO NOTHING;
  ELSE
    DELETE FROM public.agent_team_members
    WHERE team_id = canonical_team_id AND user_id = target_user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_canonical_internal_team_member ON public.org_members;
CREATE TRIGGER trg_sync_canonical_internal_team_member
  AFTER INSERT OR UPDATE OR DELETE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_canonical_internal_team_member();

CREATE OR REPLACE FUNCTION public.sync_canonical_external_team_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  canonical_team_id uuid;
BEGIN
  SELECT id INTO canonical_team_id
  FROM public.agent_teams
  WHERE org_id = NEW.org_id AND team_kind = 'external' AND name = 'External'
  LIMIT 1;

  IF canonical_team_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.platform = 'slack' AND NEW.is_bot = false AND NEW.relationship_kind = 'external' THEN
    INSERT INTO public.agent_team_external_members (team_id, person_id, added_by)
    VALUES (canonical_team_id, NEW.id, NULL)
    ON CONFLICT (team_id, person_id) DO NOTHING;
  ELSE
    DELETE FROM public.agent_team_external_members
    WHERE team_id = canonical_team_id AND person_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_canonical_external_team_member ON public.channel_members;
CREATE TRIGGER trg_sync_canonical_external_team_member
  AFTER INSERT OR UPDATE OF relationship_kind, is_bot ON public.channel_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_canonical_external_team_member();

CREATE OR REPLACE FUNCTION public.create_canonical_teams_for_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.agent_teams
    (org_id, user_id, name, color, icon, is_system, team_kind)
  VALUES
    (NEW.id, NULL, 'Internal', 'purple', 'users', true, 'internal'),
    (NEW.id, NULL, 'External', 'orange', 'contact', true, 'external'),
    (NEW.id, NULL, 'Agency Agents', 'blue', 'bot', true, 'agent')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_canonical_teams_for_organization
  ON public.organizations;
CREATE TRIGGER trg_create_canonical_teams_for_organization
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_canonical_teams_for_organization();

CREATE OR REPLACE FUNCTION public.assign_required_agency_agent_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  canonical_team_id uuid;
BEGIN
  IF NEW.agent_key NOT IN ('vibey', 'atlas', 'reed', 'blaze', 'ivy', 'lux', 'jaime') THEN
    RETURN NEW;
  END IF;

  IF NEW.org_id IS NOT NULL THEN
    SELECT id INTO canonical_team_id
    FROM public.agent_teams
    WHERE org_id = NEW.org_id AND user_id IS NULL
      AND name = 'Agency Agents' AND team_kind = 'agent'
    LIMIT 1;
  ELSIF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.agent_teams
      (org_id, user_id, name, color, icon, is_system, team_kind)
    VALUES
      (NULL, NEW.user_id, 'Agency Agents', 'blue', 'bot', true, 'agent')
    ON CONFLICT DO NOTHING;

    SELECT id INTO canonical_team_id
    FROM public.agent_teams
    WHERE org_id IS NULL AND user_id = NEW.user_id
      AND name = 'Agency Agents' AND team_kind = 'agent'
    LIMIT 1;
  END IF;

  IF canonical_team_id IS NOT NULL AND NEW.team_id IS DISTINCT FROM canonical_team_id THEN
    NEW.team_id := canonical_team_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_required_agency_agent_team
  ON public.agents_registry;
CREATE TRIGGER trg_assign_required_agency_agent_team
  BEFORE INSERT OR UPDATE OF org_id, user_id, agent_key ON public.agents_registry
  FOR EACH ROW EXECUTE FUNCTION public.assign_required_agency_agent_team();
