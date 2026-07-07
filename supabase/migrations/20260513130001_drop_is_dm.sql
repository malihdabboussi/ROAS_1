-- ============================================================
-- HUMAN DMs: drop legacy `is_dm` channels infrastructure
-- ============================================================
-- Run AFTER 20260513130000_human_dm_split.sql backfill is verified.
-- Removes the DM channels that have already been migrated to
-- `human_dm_conversations` + `human_dm_messages`, then drops the
-- helper RPC, partial index and column.
-- ============================================================

DELETE FROM public.channel_messages
 WHERE channel_id IN (SELECT id FROM public.channels WHERE is_dm = true);

DELETE FROM public.channel_memberships
 WHERE channel_id IN (SELECT id FROM public.channels WHERE is_dm = true);

DELETE FROM public.channels WHERE is_dm = true;

DROP FUNCTION IF EXISTS public.find_dm_channel(uuid, uuid, uuid);
DROP INDEX    IF EXISTS public.idx_channels_is_dm;
ALTER TABLE   public.channels DROP COLUMN IF EXISTS is_dm;
