-- Duplicate meeting items/chats: persistence keyed on the agenda row's
-- UI-synthetic id (google:/outlook:/fathom:/workspace: prefixes flip between
-- providers/accounts and agenda merges), so the same real meeting kept getting
-- new call items + workspaces + chats. Fix: enforce the stable natural keys —
-- the invite's iCalendar UID for calendar meetings and the Fathom meeting id
-- for recorded calls — so resolution upserts instead of inserting duplicates.
-- All indexes are partial and additive; ical_uid was never written before, so
-- the ical indexes start empty. Same-space Fathom duplicates are merged into
-- the canonical item before the Fathom index is enforced.

BEGIN;

-- 1) One scheduled-meeting workspace per invite per space (stable key).
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_workspaces_space_ical_uid
  ON public.meeting_workspaces (space_id, ical_uid)
  WHERE ical_uid IS NOT NULL;

-- 2) One calendar call item per invite per space; createScheduledMeeting
--    upserts against this key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_space_items_call_space_ical_uid
  ON public.space_items (space_id, (custom_data->>'ical_uid'))
  WHERE custom_data->>'entry_type' = 'call'
    AND custom_data->>'ical_uid' IS NOT NULL;

-- 3) Merge pre-existing same-space duplicate Fathom call items into the
--    canonical row (the one with a workspace, else the oldest), re-pointing
--    children, so the Fathom natural-key index below can be created.
--    Precedent: 20260724235500_dedupe_canonical_fathom_meeting.sql.
DO $$
DECLARE
  dup RECORD;
  keeper_has_primary BOOLEAN;
  keeper_has_workspace BOOLEAN;
BEGIN
  FOR dup IN
    WITH fathom_calls AS (
      SELECT
        si.id,
        si.space_id,
        si.custom_data #>> '{external_automation,meeting_id}' AS fathom_meeting_id,
        si.created_at
      FROM public.space_items si
      WHERE si.custom_data->>'entry_type' = 'call'
        AND si.custom_data #>> '{external_automation,meeting_id}' IS NOT NULL
    ),
    ranked AS (
      SELECT
        fc.id,
        fc.space_id,
        fc.fathom_meeting_id,
        ROW_NUMBER() OVER (
          PARTITION BY fc.space_id, fc.fathom_meeting_id
          ORDER BY (mw.meeting_item_id IS NOT NULL) DESC, fc.created_at ASC, fc.id ASC
        ) AS row_rank
      FROM fathom_calls fc
      LEFT JOIN public.meeting_workspaces mw ON mw.meeting_item_id = fc.id
    )
    SELECT loser.id AS dup_id, keeper.id AS keep_id
    FROM ranked loser
    JOIN ranked keeper
      ON keeper.space_id = loser.space_id
      AND keeper.fathom_meeting_id = loser.fathom_meeting_id
      AND keeper.row_rank = 1
    WHERE loser.row_rank > 1
  LOOP
    UPDATE public.space_items
    SET parent_item_id = dup.keep_id
    WHERE parent_item_id = dup.dup_id;

    SELECT EXISTS (
      SELECT 1 FROM public.meeting_recordings
      WHERE meeting_item_id = dup.keep_id AND is_primary
    ) INTO keeper_has_primary;
    UPDATE public.meeting_recordings
    SET meeting_item_id = dup.keep_id,
        is_primary = CASE WHEN keeper_has_primary THEN false ELSE is_primary END
    WHERE meeting_item_id = dup.dup_id;

    DELETE FROM public.meeting_actions loser_action
    WHERE loser_action.meeting_item_id = dup.dup_id
      AND EXISTS (
        SELECT 1 FROM public.meeting_actions keeper_action
        WHERE keeper_action.meeting_item_id = dup.keep_id
          AND keeper_action.source_key = loser_action.source_key
      );
    UPDATE public.meeting_actions
    SET meeting_item_id = dup.keep_id
    WHERE meeting_item_id = dup.dup_id;

    DELETE FROM public.meeting_context_links loser_link
    WHERE loser_link.meeting_item_id = dup.dup_id
      AND EXISTS (
        SELECT 1 FROM public.meeting_context_links keeper_link
        WHERE keeper_link.meeting_item_id = dup.keep_id
          AND keeper_link.entity_type = loser_link.entity_type
          AND keeper_link.entity_id = loser_link.entity_id
      );
    UPDATE public.meeting_context_links
    SET meeting_item_id = dup.keep_id
    WHERE meeting_item_id = dup.dup_id;

    UPDATE public.meeting_snippets
    SET meeting_item_id = dup.keep_id
    WHERE meeting_item_id = dup.dup_id;

    -- Keeper ranks first when it has a workspace, so a duplicate's workspace
    -- moves only when the keeper has none; otherwise it dies with the item.
    SELECT EXISTS (
      SELECT 1 FROM public.meeting_workspaces WHERE meeting_item_id = dup.keep_id
    ) INTO keeper_has_workspace;
    IF NOT keeper_has_workspace THEN
      UPDATE public.meeting_workspaces
      SET meeting_item_id = dup.keep_id
      WHERE meeting_item_id = dup.dup_id;
    END IF;

    DELETE FROM public.space_items WHERE id = dup.dup_id;
  END LOOP;
END
$$;

-- 4) One Fathom call item per recorded meeting per space.
CREATE UNIQUE INDEX IF NOT EXISTS idx_space_items_call_space_fathom_meeting
  ON public.space_items (space_id, (custom_data #>> '{external_automation,meeting_id}'))
  WHERE custom_data->>'entry_type' = 'call'
    AND custom_data #>> '{external_automation,meeting_id}' IS NOT NULL;

COMMIT;
