BEGIN;

-- 1) Rename base tables.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lists'
  ) THEN
    ALTER TABLE public.lists RENAME TO spaces;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'list_items'
  ) THEN
    ALTER TABLE public.list_items RENAME TO space_items;
  END IF;
END
$$;

-- 2) Rename relation column list_id -> space_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'space_items' AND column_name = 'list_id'
  ) THEN
    ALTER TABLE public.space_items RENAME COLUMN list_id TO space_id;
  END IF;
END
$$;

-- 3) Rename primary indexes for clarity.
ALTER INDEX IF EXISTS public.idx_lists_org_id RENAME TO idx_spaces_org_id;
ALTER INDEX IF EXISTS public.idx_lists_user_id RENAME TO idx_spaces_user_id;
ALTER INDEX IF EXISTS public.idx_lists_campaign_id RENAME TO idx_spaces_campaign_id;

ALTER INDEX IF EXISTS public.idx_list_items_list_id RENAME TO idx_space_items_space_id;
ALTER INDEX IF EXISTS public.idx_list_items_org_id RENAME TO idx_space_items_org_id;
ALTER INDEX IF EXISTS public.idx_list_items_status RENAME TO idx_space_items_status;
ALTER INDEX IF EXISTS public.idx_list_items_linked_mission RENAME TO idx_space_items_linked_mission;
ALTER INDEX IF EXISTS public.idx_list_items_suggestion_state RENAME TO idx_space_items_suggestion_state;
ALTER INDEX IF EXISTS public.idx_list_items_recurrence_active RENAME TO idx_space_items_recurrence_active;
ALTER INDEX IF EXISTS public.idx_list_items_recurrence_parent RENAME TO idx_space_items_recurrence_parent;

-- 4) Rename key constraints where present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lists_pkey') THEN
    ALTER TABLE public.spaces RENAME CONSTRAINT lists_pkey TO spaces_pkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'list_items_pkey') THEN
    ALTER TABLE public.space_items RENAME CONSTRAINT list_items_pkey TO space_items_pkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'list_items_list_id_fkey') THEN
    ALTER TABLE public.space_items RENAME CONSTRAINT list_items_list_id_fkey TO space_items_space_id_fkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'list_items_recurrence_parent_id_fkey') THEN
    ALTER TABLE public.space_items RENAME CONSTRAINT list_items_recurrence_parent_id_fkey TO space_items_recurrence_parent_id_fkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'list_items_linked_mission_id_fkey') THEN
    ALTER TABLE public.space_items RENAME CONSTRAINT list_items_linked_mission_id_fkey TO space_items_linked_mission_id_fkey;
  END IF;
END
$$;

-- 5) Recreate RLS policies with new table names.
DROP POLICY IF EXISTS "Users can read own lists" ON public.spaces;
DROP POLICY IF EXISTS "Org members can read team lists" ON public.spaces;
DROP POLICY IF EXISTS "Users can insert own lists" ON public.spaces;
DROP POLICY IF EXISTS "Users can update own lists" ON public.spaces;
DROP POLICY IF EXISTS "Users can delete own lists" ON public.spaces;

DROP POLICY IF EXISTS "Users can read own list items" ON public.space_items;
DROP POLICY IF EXISTS "Org members can read team list items" ON public.space_items;
DROP POLICY IF EXISTS "Users can insert own list items" ON public.space_items;
DROP POLICY IF EXISTS "Users can update own list items" ON public.space_items;
DROP POLICY IF EXISTS "Users can delete own list items" ON public.space_items;

CREATE POLICY "Users can read own spaces"
  ON public.spaces FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can read team spaces"
  ON public.spaces FOR SELECT TO public
  USING (visibility = 'team' AND org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Users can insert own spaces"
  ON public.spaces FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spaces"
  ON public.spaces FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own spaces"
  ON public.spaces FOR DELETE TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own space items"
  ON public.space_items FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can read team space items"
  ON public.space_items FOR SELECT TO public
  USING (
    org_id IS NOT NULL
    AND is_org_member(org_id)
    AND EXISTS (
      SELECT 1 FROM public.spaces s
      WHERE s.id = public.space_items.space_id
        AND s.visibility = 'team'
    )
  );

CREATE POLICY "Users can insert own space items"
  ON public.space_items FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own space items"
  ON public.space_items FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own space items"
  ON public.space_items FOR DELETE TO public
  USING (auth.uid() = user_id);

-- 6) Recreate updated_at triggers with new names.
DROP TRIGGER IF EXISTS set_lists_updated_at ON public.spaces;
CREATE TRIGGER set_spaces_updated_at
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_list_items_updated_at ON public.space_items;
CREATE TRIGGER set_space_items_updated_at
  BEFORE UPDATE ON public.space_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7) Suggestion-state trigger/function rename and rebind.
CREATE OR REPLACE FUNCTION public.default_space_item_suggestion_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source = 'agent_suggested' AND NEW.suggestion_state IS NULL THEN
    NEW.suggestion_state := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_list_item_suggestion_state ON public.space_items;
DROP TRIGGER IF EXISTS trg_default_space_item_suggestion_state ON public.space_items;
CREATE TRIGGER trg_default_space_item_suggestion_state
  BEFORE INSERT ON public.space_items
  FOR EACH ROW EXECUTE FUNCTION public.default_space_item_suggestion_state();

DROP FUNCTION IF EXISTS public.default_list_item_suggestion_state();

-- 8) Recurrence lock function rename.
CREATE OR REPLACE FUNCTION public.try_acquire_space_items_recurrence_lock()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_try_advisory_lock(hashtext('space_items_recurrence'));
$$;

CREATE OR REPLACE FUNCTION public.release_space_items_recurrence_lock()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_advisory_unlock(hashtext('space_items_recurrence'));
$$;

DROP FUNCTION IF EXISTS public.try_acquire_list_items_recurrence_lock();
DROP FUNCTION IF EXISTS public.release_list_items_recurrence_lock();

-- 9) Mission -> space item sync trigger/function.
CREATE OR REPLACE FUNCTION public.sync_mission_status_to_space_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'done' THEN
      UPDATE public.space_items
      SET status = 'done', updated_at = now()
      WHERE linked_mission_id = NEW.id AND status <> 'done';
    ELSIF NEW.status IN ('blocked') THEN
      UPDATE public.space_items
      SET status = 'in_progress', updated_at = now()
      WHERE linked_mission_id = NEW.id AND status NOT IN ('done');
    ELSIF NEW.status IN ('failed', 'error') THEN
      UPDATE public.space_items
      SET status = 'todo',
          notes = COALESCE(notes, '') || E'\n[Mission failed: ' || COALESCE(NEW.error, 'unknown error') || ']',
          updated_at = now()
      WHERE linked_mission_id = NEW.id AND status NOT IN ('done');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mission_to_list_item ON public.missions;
DROP TRIGGER IF EXISTS trg_sync_mission_to_space_item ON public.missions;
CREATE TRIGGER trg_sync_mission_to_space_item
  AFTER UPDATE ON public.missions
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.sync_mission_status_to_space_item();

DROP FUNCTION IF EXISTS public.sync_mission_status_to_list_item();

-- 10) Views depending on list_items/lists.
-- team_roster is intentionally not recreated here because it has additional
-- columns added by newer migrations in some environments. Table/column renames
-- update dependent view references automatically.

DROP VIEW IF EXISTS public.your_turn_items;

CREATE VIEW public.your_turn_items
WITH (security_invoker = true)
AS
SELECT
  'mission_subtask'::text AS kind,
  ms.id,
  ms.title,
  ms.status,
  ms.assigned_user_id AS assignee_user_id,
  ms.org_id,
  ms.mission_id,
  NULL::uuid AS space_id,
  NULL::text AS suggestion_state,
  ms.scheduled_at AS due_at,
  ('/mission-control?mission=' || ms.mission_id::text) AS source_url,
  left(COALESCE(ms.feedback, ''), 280) AS preview,
  ms.created_at,
  ms.updated_at
FROM public.mission_subtasks ms
WHERE ms.assignee_type = 'human'
  AND ms.status IN ('awaiting_human','pending','revision')
  AND ms.assigned_user_id = auth.uid()

UNION ALL

SELECT
  'space_item'::text AS kind,
  si.id,
  si.title,
  si.status,
  si.assignee_id::uuid AS assignee_user_id,
  si.org_id,
  si.linked_mission_id AS mission_id,
  si.space_id,
  si.suggestion_state,
  si.due_date AS due_at,
  ('/spaces?space=' || si.space_id::text || '&item=' || si.id::text) AS source_url,
  left(COALESCE(si.notes, ''), 280) AS preview,
  si.created_at,
  si.updated_at
FROM public.space_items si
WHERE si.assignee_type = 'human'
  AND si.assignee_id IS NOT NULL
  AND si.assignee_id::uuid = auth.uid()
  AND (si.suggestion_state IS NULL OR si.suggestion_state <> 'dismissed')
  AND si.status <> 'done'

UNION ALL

SELECT
  'suggestion'::text AS kind,
  si.id,
  si.title,
  si.status,
  si.user_id AS assignee_user_id,
  si.org_id,
  si.linked_mission_id AS mission_id,
  si.space_id,
  si.suggestion_state,
  si.due_date AS due_at,
  ('/spaces?space=' || si.space_id::text || '&item=' || si.id::text) AS source_url,
  left(COALESCE(si.notes, ''), 280) AS preview,
  si.created_at,
  si.updated_at
FROM public.space_items si
WHERE si.source = 'agent_suggested'
  AND si.suggestion_state = 'pending'
  AND si.user_id = auth.uid()

UNION ALL

SELECT
  'plan_approval'::text AS kind,
  m.id,
  m.title,
  m.status,
  m.user_id AS assignee_user_id,
  m.org_id,
  m.id AS mission_id,
  NULL::uuid AS space_id,
  NULL::text AS suggestion_state,
  m.due_date AS due_at,
  ('/mission-control?mission=' || m.id::text || '&tab=plan') AS source_url,
  left(COALESCE(m.brief, m.description, ''), 280) AS preview,
  m.created_at,
  m.updated_at
FROM public.missions m
WHERE m.status = 'pending_approval'
  AND m.user_id = auth.uid();

COMMENT ON VIEW public.your_turn_items IS 'Unified inbox: mission human subtasks + space items assigned to me + pending agent suggestions + plan approvals awaiting my decision. security_invoker + auth.uid() filter.';
GRANT SELECT ON public.your_turn_items TO authenticated;

-- 11) Realtime publication membership.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public'
        AND c.relname = 'spaces'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.spaces;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public'
        AND c.relname = 'space_items'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.space_items;
    END IF;
  END IF;
END
$$;

-- 12) New schema columns for Spaces infrastructure.
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS schema JSONB NOT NULL DEFAULT
    '{"version":1,"fields":[{"id":"title","name":"Title","type":"text","system":true,"required":true},{"id":"status","name":"Status","type":"select","system":true,"required":true,"options":[{"id":"todo","label":"To Do","color":"cyan"},{"id":"in_progress","label":"In Progress","color":"amber"},{"id":"in_review","label":"In Review","color":"violet"},{"id":"done","label":"Done","color":"emerald"}]},{"id":"priority","name":"Priority","type":"select","system":true,"required":true,"options":[{"id":"low","label":"Low","color":"slate"},{"id":"medium","label":"Medium","color":"blue"},{"id":"high","label":"High","color":"orange"},{"id":"urgent","label":"Urgent","color":"red"}]},{"id":"assignee","name":"Assignee","type":"assignee","system":true},{"id":"due_date","name":"Due Date","type":"date","system":true}],"views":[{"id":"list","type":"list","name":"List","visible_fields":["status","title","priority","assignee","due_date"]},{"id":"board","type":"kanban","name":"Board","group_by":"status","visible_fields":["title","priority","assignee","due_date"]}],"automations":[]}'::jsonb;

ALTER TABLE public.space_items
  ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
