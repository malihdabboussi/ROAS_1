-- Transactional merge of duplicate meeting items into a survivor.
-- Repoints everything hanging off each duplicate (recordings, legacy actions,
-- context links, snippets, workspace fields, child follow-ups/docs, activity,
-- deliverables), applies the API-computed survivor patch, then deletes the
-- duplicates. Called via supabase.rpc from MeetingMergeRepository.

CREATE OR REPLACE FUNCTION public.merge_meeting_items(
  p_space_id UUID,
  p_survivor_item_id UUID,
  p_duplicate_item_ids UUID[],
  p_survivor_patch JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dup UUID;
  v_dup_workspace public.meeting_workspaces%ROWTYPE;
  v_count INT;
  v_moved_recordings INT := 0;
  v_moved_actions INT := 0;
  v_moved_context_links INT := 0;
  v_moved_snippets INT := 0;
  v_moved_children INT := 0;
  v_moved_activity INT := 0;
  v_moved_deliverables INT := 0;
BEGIN
  IF p_duplicate_item_ids IS NULL OR array_length(p_duplicate_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No duplicate meetings provided';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.space_items
    WHERE id = p_survivor_item_id AND space_id = p_space_id
  ) THEN
    RAISE EXCEPTION 'Survivor meeting % not found in space %', p_survivor_item_id, p_space_id;
  END IF;
  IF NOT public.can_write_meeting_item(p_survivor_item_id) THEN
    RAISE EXCEPTION 'Meeting write access denied';
  END IF;

  FOREACH v_dup IN ARRAY p_duplicate_item_ids LOOP
    IF v_dup = p_survivor_item_id THEN
      RAISE EXCEPTION 'Survivor cannot be merged into itself';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.space_items
      WHERE id = v_dup AND space_id = p_space_id
    ) THEN
      RAISE EXCEPTION 'Duplicate meeting % not found in space %', v_dup, p_space_id;
    END IF;
    IF NOT public.can_write_meeting_item(v_dup) THEN
      RAISE EXCEPTION 'Meeting write access denied';
    END IF;
  END LOOP;

  FOREACH v_dup IN ARRAY p_duplicate_item_ids LOOP
    -- Recordings: only one primary may exist on the survivor (partial unique index).
    IF EXISTS (
      SELECT 1 FROM public.meeting_recordings
      WHERE meeting_item_id = p_survivor_item_id AND is_primary = true
    ) THEN
      UPDATE public.meeting_recordings
      SET
        is_primary = false,
        classification = CASE
          WHEN classification = 'primary' THEN 'supplemental'
          ELSE classification
        END
      WHERE meeting_item_id = v_dup AND is_primary = true;
    END IF;
    UPDATE public.meeting_recordings
    SET meeting_item_id = p_survivor_item_id
    WHERE meeting_item_id = v_dup;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_moved_recordings := v_moved_recordings + v_count;

    -- Legacy actions: the survivor's copy wins on (meeting_item_id, source_key).
    DELETE FROM public.meeting_actions dup_action
    WHERE dup_action.meeting_item_id = v_dup
      AND dup_action.source_key IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.meeting_actions keep_action
        WHERE keep_action.meeting_item_id = p_survivor_item_id
          AND keep_action.source_key = dup_action.source_key
      );
    UPDATE public.meeting_actions
    SET meeting_item_id = p_survivor_item_id
    WHERE meeting_item_id = v_dup;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_moved_actions := v_moved_actions + v_count;

    -- Context links: drop rows that would collide or become self-links.
    DELETE FROM public.meeting_context_links dup_link
    WHERE dup_link.meeting_item_id = v_dup
      AND (
        (dup_link.entity_type = 'meeting' AND dup_link.entity_id = p_survivor_item_id)
        OR EXISTS (
          SELECT 1 FROM public.meeting_context_links keep_link
          WHERE keep_link.meeting_item_id = p_survivor_item_id
            AND keep_link.entity_type = dup_link.entity_type
            AND keep_link.entity_id = dup_link.entity_id
        )
      );
    DELETE FROM public.meeting_context_links
    WHERE meeting_item_id = p_survivor_item_id
      AND entity_type = 'meeting'
      AND entity_id = v_dup;
    UPDATE public.meeting_context_links
    SET meeting_item_id = p_survivor_item_id
    WHERE meeting_item_id = v_dup;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_moved_context_links := v_moved_context_links + v_count;

    -- Snippets: plain repoint.
    UPDATE public.meeting_snippets
    SET meeting_item_id = p_survivor_item_id
    WHERE meeting_item_id = v_dup;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_moved_snippets := v_moved_snippets + v_count;

    -- Workspace: delete the duplicate's row first (unique space/calendar_event),
    -- then fill the survivor's null fields from it. The duplicate's
    -- conversation_id is intentionally dropped — conversation ids derive from
    -- the meeting item id and cannot transfer.
    SELECT * INTO v_dup_workspace
    FROM public.meeting_workspaces
    WHERE meeting_item_id = v_dup;
    IF FOUND THEN
      DELETE FROM public.meeting_workspaces WHERE meeting_item_id = v_dup;
      IF EXISTS (
        SELECT 1 FROM public.meeting_workspaces
        WHERE meeting_item_id = p_survivor_item_id
      ) THEN
        UPDATE public.meeting_workspaces keep
        SET
          calendar_event_id = COALESCE(
            keep.calendar_event_id,
            CASE WHEN EXISTS (
              SELECT 1 FROM public.meeting_workspaces other
              WHERE other.space_id = keep.space_id
                AND other.calendar_event_id = v_dup_workspace.calendar_event_id
            ) THEN NULL ELSE v_dup_workspace.calendar_event_id END
          ),
          ical_uid = COALESCE(keep.ical_uid, v_dup_workspace.ical_uid),
          live_started_at = LEAST(keep.live_started_at, v_dup_workspace.live_started_at),
          live_ended_at = GREATEST(keep.live_ended_at, v_dup_workspace.live_ended_at),
          agenda_doc_item_id = COALESCE(keep.agenda_doc_item_id, v_dup_workspace.agenda_doc_item_id),
          notes_doc_item_id = COALESCE(keep.notes_doc_item_id, v_dup_workspace.notes_doc_item_id),
          recap_doc_item_id = COALESCE(keep.recap_doc_item_id, v_dup_workspace.recap_doc_item_id),
          next_meeting_item_id = COALESCE(keep.next_meeting_item_id, v_dup_workspace.next_meeting_item_id),
          updated_at = now()
        WHERE keep.meeting_item_id = p_survivor_item_id;
      ELSE
        INSERT INTO public.meeting_workspaces (
          meeting_item_id, space_id, user_id, org_id,
          calendar_event_id, ical_uid, phase,
          live_started_at, live_ended_at,
          agenda_doc_item_id, notes_doc_item_id, recap_doc_item_id,
          next_meeting_item_id, processing_state
        ) VALUES (
          p_survivor_item_id, v_dup_workspace.space_id, v_dup_workspace.user_id, v_dup_workspace.org_id,
          v_dup_workspace.calendar_event_id, v_dup_workspace.ical_uid, v_dup_workspace.phase,
          v_dup_workspace.live_started_at, v_dup_workspace.live_ended_at,
          v_dup_workspace.agenda_doc_item_id, v_dup_workspace.notes_doc_item_id, v_dup_workspace.recap_doc_item_id,
          v_dup_workspace.next_meeting_item_id, v_dup_workspace.processing_state
        );
      END IF;
    END IF;

    -- Continuity: prior meetings that pointed at the duplicate now point at the survivor.
    UPDATE public.meeting_workspaces
    SET next_meeting_item_id = p_survivor_item_id
    WHERE next_meeting_item_id = v_dup;

    -- Child follow-ups and docs are dual-linked; rewrite every link style.
    SELECT COUNT(*) INTO v_count
    FROM public.space_items
    WHERE parent_item_id = v_dup
       OR custom_data->>'source_call_item_id' = v_dup::text
       OR custom_data->>'meeting_item_id' = v_dup::text;
    v_moved_children := v_moved_children + v_count;

    UPDATE public.space_items
    SET parent_item_id = p_survivor_item_id
    WHERE parent_item_id = v_dup;
    UPDATE public.space_items
    SET custom_data = jsonb_set(
      COALESCE(custom_data, '{}'::jsonb),
      '{source_call_item_id}',
      to_jsonb(p_survivor_item_id::text)
    )
    WHERE custom_data->>'source_call_item_id' = v_dup::text;
    UPDATE public.space_items
    SET custom_data = jsonb_set(
      COALESCE(custom_data, '{}'::jsonb),
      '{meeting_item_id}',
      to_jsonb(p_survivor_item_id::text)
    )
    WHERE custom_data->>'meeting_item_id' = v_dup::text;

    -- Comments/attachments and deliverables would be destroyed by the CASCADE
    -- delete below; keep them on the survivor instead.
    UPDATE public.space_item_activity
    SET item_id = p_survivor_item_id
    WHERE item_id = v_dup;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_moved_activity := v_moved_activity + v_count;

    UPDATE public.space_item_deliverables
    SET item_id = p_survivor_item_id
    WHERE item_id = v_dup;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_moved_deliverables := v_moved_deliverables + v_count;

    -- Retrieval index rows have no FK; drop the duplicate's.
    DELETE FROM public.space_semantic_chunks
    WHERE source_id = v_dup::text AND source_type IN ('space_task', 'space_doc');
    DELETE FROM public.space_semantic_objects
    WHERE source_id = v_dup::text AND source_type IN ('space_task', 'space_doc');
    DELETE FROM public.space_semantic_edges
    WHERE (from_source_id = v_dup::text AND from_source_type IN ('space_task', 'space_doc'))
       OR (to_source_id = v_dup::text AND to_source_type IN ('space_task', 'space_doc'));

    -- Everything worth keeping has been repointed; drop the duplicate row.
    DELETE FROM public.space_items WHERE id = v_dup;
  END LOOP;

  -- Survivor field patch (merged custom_data + description/notes) computed by
  -- the API layer from the duplicates before they were deleted.
  UPDATE public.space_items
  SET
    custom_data = COALESCE(p_survivor_patch->'custom_data', custom_data),
    description = COALESCE(p_survivor_patch->>'description', description),
    notes = COALESCE(p_survivor_patch->>'notes', notes),
    updated_at = now()
  WHERE id = p_survivor_item_id;

  RETURN jsonb_build_object(
    'duplicates_merged', array_length(p_duplicate_item_ids, 1),
    'recordings_moved', v_moved_recordings,
    'actions_moved', v_moved_actions,
    'context_links_moved', v_moved_context_links,
    'snippets_moved', v_moved_snippets,
    'children_moved', v_moved_children,
    'activity_moved', v_moved_activity,
    'deliverables_moved', v_moved_deliverables
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_meeting_items(UUID, UUID, UUID[], JSONB)
  TO authenticated, service_role;
