-- Account/org skill catalog organization: folders (primary group) + multi tags.
-- Skill content ownership stays in agent_skills; account-wide catalog skills use agent_key = '*'.
-- This migration also promotes user-created (source='user') skills to agent_key='*' so every
-- agent can resolve them via existing list/sync (agent_key OR '*') without cloning.

-- ---------------------------------------------------------------------------
-- Folders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skill_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.skill_folders(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT skill_folders_owner_chk CHECK (
    (org_id IS NOT NULL AND user_id IS NULL)
    OR (org_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS skill_folders_org_name_unique
  ON public.skill_folders (org_id, lower(name))
  WHERE org_id IS NOT NULL AND parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS skill_folders_user_name_unique
  ON public.skill_folders (user_id, lower(name))
  WHERE user_id IS NOT NULL AND parent_id IS NULL;

CREATE INDEX IF NOT EXISTS skill_folders_org_idx ON public.skill_folders (org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS skill_folders_user_idx ON public.skill_folders (user_id) WHERE user_id IS NOT NULL;

-- Membership: skill_key within the same ownership scope as the folder
CREATE TABLE IF NOT EXISTS public.skill_folder_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.skill_folders(id) ON DELETE CASCADE,
  skill_key TEXT NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT skill_folder_memberships_owner_chk CHECK (
    (org_id IS NOT NULL AND user_id IS NULL)
    OR (org_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS skill_folder_memberships_org_skill_unique
  ON public.skill_folder_memberships (org_id, skill_key)
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS skill_folder_memberships_user_skill_unique
  ON public.skill_folder_memberships (user_id, skill_key)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS skill_folder_memberships_folder_idx
  ON public.skill_folder_memberships (folder_id);

-- ---------------------------------------------------------------------------
-- Tags (multi)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT skill_tags_owner_chk CHECK (
    (org_id IS NOT NULL AND user_id IS NULL)
    OR (org_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS skill_tags_org_name_unique
  ON public.skill_tags (org_id, lower(name))
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS skill_tags_user_name_unique
  ON public.skill_tags (user_id, lower(name))
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.skill_tag_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES public.skill_tags(id) ON DELETE CASCADE,
  skill_key TEXT NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT skill_tag_memberships_owner_chk CHECK (
    (org_id IS NOT NULL AND user_id IS NULL)
    OR (org_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS skill_tag_memberships_org_unique
  ON public.skill_tag_memberships (tag_id, skill_key)
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS skill_tag_memberships_user_unique
  ON public.skill_tag_memberships (tag_id, skill_key)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS skill_tag_memberships_skill_org_idx
  ON public.skill_tag_memberships (org_id, skill_key)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS skill_tag_memberships_skill_user_idx
  ON public.skill_tag_memberships (user_id, skill_key)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.skill_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_folder_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_tag_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_folders_select ON public.skill_folders;
CREATE POLICY skill_folders_select ON public.skill_folders FOR SELECT USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id))
);

DROP POLICY IF EXISTS skill_folders_write ON public.skill_folders;
CREATE POLICY skill_folders_write ON public.skill_folders FOR ALL USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
) WITH CHECK (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
);

DROP POLICY IF EXISTS skill_folder_memberships_select ON public.skill_folder_memberships;
CREATE POLICY skill_folder_memberships_select ON public.skill_folder_memberships FOR SELECT USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id))
);

DROP POLICY IF EXISTS skill_folder_memberships_write ON public.skill_folder_memberships;
CREATE POLICY skill_folder_memberships_write ON public.skill_folder_memberships FOR ALL USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
) WITH CHECK (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
);

DROP POLICY IF EXISTS skill_tags_select ON public.skill_tags;
CREATE POLICY skill_tags_select ON public.skill_tags FOR SELECT USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id))
);

DROP POLICY IF EXISTS skill_tags_write ON public.skill_tags;
CREATE POLICY skill_tags_write ON public.skill_tags FOR ALL USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
) WITH CHECK (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
);

DROP POLICY IF EXISTS skill_tag_memberships_select ON public.skill_tag_memberships;
CREATE POLICY skill_tag_memberships_select ON public.skill_tag_memberships FOR SELECT USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id))
);

DROP POLICY IF EXISTS skill_tag_memberships_write ON public.skill_tag_memberships;
CREATE POLICY skill_tag_memberships_write ON public.skill_tag_memberships FOR ALL USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
) WITH CHECK (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
);

-- Service role / internal API uses service key (bypasses RLS). Authenticated
-- members can read; admins manage org folders/tags.

-- ---------------------------------------------------------------------------
-- Promote user-created skills to account catalog (agent_key = '*')
-- Prefer newest row per (scope, skill_key). Skip when '*' already exists.
-- ---------------------------------------------------------------------------

-- Personal scope: promote skill rows, then matching resources for those keys
WITH ranked AS (
  SELECT
    id,
    user_id,
    skill_key,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, skill_key
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn
  FROM public.agent_skills
  WHERE source = 'user'
    AND user_id IS NOT NULL
    AND org_id IS NULL
    AND agent_key IS DISTINCT FROM '*'
    AND NOT EXISTS (
      SELECT 1
      FROM public.agent_skills existing
      WHERE existing.user_id = agent_skills.user_id
        AND existing.org_id IS NULL
        AND existing.skill_key = agent_skills.skill_key
        AND existing.agent_key = '*'
    )
),
promote AS (
  SELECT id, user_id, skill_key FROM ranked WHERE rn = 1
),
updated AS (
  UPDATE public.agent_skills AS s
  SET agent_key = '*', updated_at = now()
  FROM promote p
  WHERE s.id = p.id
  RETURNING s.user_id, s.skill_key
)
UPDATE public.agent_skill_resources AS r
SET agent_key = '*'
FROM updated u
WHERE r.user_id = u.user_id
  AND r.org_id IS NULL
  AND r.skill_key = u.skill_key
  AND r.agent_key IS DISTINCT FROM '*';

-- Org scope
WITH ranked AS (
  SELECT
    id,
    org_id,
    skill_key,
    ROW_NUMBER() OVER (
      PARTITION BY org_id, skill_key
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn
  FROM public.agent_skills
  WHERE source = 'user'
    AND org_id IS NOT NULL
    AND user_id IS NULL
    AND agent_key IS DISTINCT FROM '*'
    AND NOT EXISTS (
      SELECT 1
      FROM public.agent_skills existing
      WHERE existing.org_id = agent_skills.org_id
        AND existing.user_id IS NULL
        AND existing.skill_key = agent_skills.skill_key
        AND existing.agent_key = '*'
    )
),
promote AS (
  SELECT id, org_id, skill_key FROM ranked WHERE rn = 1
),
updated AS (
  UPDATE public.agent_skills AS s
  SET agent_key = '*', updated_at = now()
  FROM promote p
  WHERE s.id = p.id
  RETURNING s.org_id, s.skill_key
)
UPDATE public.agent_skill_resources AS r
SET agent_key = '*'
FROM updated u
WHERE r.org_id = u.org_id
  AND r.user_id IS NULL
  AND r.skill_key = u.skill_key
  AND r.agent_key IS DISTINCT FROM '*';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_folders TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_folder_memberships TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_tags TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_tag_memberships TO authenticated, service_role;
