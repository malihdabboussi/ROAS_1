-- Per-view share DB-level row filter for space_items.
-- Filter shapes evaluated:
--   * toolbar_filter_assignee_participant_ids: string[]
--   * toolbar_assigned_to_me: boolean
--   * (view with no toolbar filters: grants all items the view normally shows)
-- Only task-style view types are supported for space_items access:
--   list | table | kanban | gallery | missions.
-- Other view types (channels/contacts/ig_research/funnels/etc.) display
-- non-space_item data and are intentionally not granted here.
-- Insert is intentionally NOT granted by per-view shares (creating new items
-- requires whole-space write access via has_space_write_access).

CREATE OR REPLACE FUNCTION public.space_view_share_grants_item(
  p_space_id uuid,
  p_item_id  uuid,
  p_min_level text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_share         record;
  v_view          jsonb;
  v_item          record;
  v_assignee_ids  jsonb;
  v_assigned_me   boolean;
  v_passes        boolean;
BEGIN
  IF p_min_level NOT IN ('view','edit','admin') THEN
    RETURN false;
  END IF;

  SELECT id, space_id, assignee_type, assignee_id
    INTO v_item
    FROM public.space_items
   WHERE id = p_item_id AND space_id = p_space_id;
  IF NOT FOUND THEN RETURN false; END IF;

  FOR v_share IN
    SELECT vs.view_id, vs.level
      FROM public.space_view_shares vs
     WHERE vs.space_id = p_space_id
       AND (
         (vs.entity_type = 'user' AND vs.entity_id = auth.uid())
         OR (vs.entity_type = 'org' AND vs.org_id IS NOT NULL AND public.is_org_member(vs.org_id))
       )
       AND (
         (p_min_level = 'view'  AND vs.level IN ('view','edit','admin'))
         OR (p_min_level = 'edit'  AND vs.level IN ('edit','admin'))
         OR (p_min_level = 'admin' AND vs.level = 'admin')
       )
  LOOP
    SELECT elem INTO v_view
      FROM public.spaces s,
           jsonb_array_elements(COALESCE(s.schema -> 'views', '[]'::jsonb)) AS elem
     WHERE s.id = p_space_id
       AND elem ->> 'id' = v_share.view_id
     LIMIT 1;
    IF v_view IS NULL THEN CONTINUE; END IF;
    IF (v_view ->> 'type') NOT IN ('list','table','kanban','gallery','missions') THEN
      CONTINUE;
    END IF;

    v_passes := true;

    -- toolbar_assigned_to_me
    v_assigned_me := COALESCE((v_view ->> 'toolbar_assigned_to_me')::boolean, false);
    IF v_assigned_me THEN
      IF NOT (v_item.assignee_type = 'human' AND v_item.assignee_id = auth.uid()::text) THEN
        v_passes := false;
      END IF;
    END IF;

    -- toolbar_filter_assignee_participant_ids
    IF v_passes THEN
      v_assignee_ids := v_view -> 'toolbar_filter_assignee_participant_ids';
      IF v_assignee_ids IS NOT NULL
         AND jsonb_typeof(v_assignee_ids) = 'array'
         AND jsonb_array_length(v_assignee_ids) > 0
      THEN
        IF v_item.assignee_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM jsonb_array_elements_text(v_assignee_ids) AS t(id)
             WHERE t.id = v_item.assignee_id
           )
        THEN
          v_passes := false;
        END IF;
      END IF;
    END IF;

    IF v_passes THEN RETURN true; END IF;
  END LOOP;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS "Per-view share read" ON public.space_items;
CREATE POLICY "Per-view share read"
  ON public.space_items FOR SELECT TO public
  USING (
    public.space_items.is_private = false
    AND public.space_view_share_grants_item(public.space_items.space_id, public.space_items.id, 'view')
  );

DROP POLICY IF EXISTS "Per-view share update" ON public.space_items;
CREATE POLICY "Per-view share update"
  ON public.space_items FOR UPDATE TO public
  USING (
    public.space_items.is_private = false
    AND public.space_view_share_grants_item(public.space_items.space_id, public.space_items.id, 'edit')
  )
  WITH CHECK (
    public.space_items.is_private = false
    AND public.space_view_share_grants_item(public.space_items.space_id, public.space_items.id, 'edit')
  );

DROP POLICY IF EXISTS "Per-view share delete" ON public.space_items;
CREATE POLICY "Per-view share delete"
  ON public.space_items FOR DELETE TO public
  USING (
    public.space_items.is_private = false
    AND public.space_view_share_grants_item(public.space_items.space_id, public.space_items.id, 'edit')
  );

COMMENT ON FUNCTION public.space_view_share_grants_item(uuid, uuid, text) IS
  'Per-view share row-level filter for space_items. Returns true if the calling auth.uid() (directly or via org membership) has a space_view_shares row for some task-style view in p_space_id whose toolbar filters match the item, at >= p_min_level. Insert is intentionally NOT granted by per-view shares (creating new items requires whole-space write access).';
