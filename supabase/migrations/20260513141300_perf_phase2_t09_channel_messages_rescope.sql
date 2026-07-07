-- Phase 2 table 9/10: rescope channel_messages service_role policy (TO service_role).
-- Eliminates multi-permissive overlap with the 4 user-facing policies on {public}.
-- No behavior change: service role still has full access.

DROP POLICY IF EXISTS "Service role full access channel_messages" ON public.channel_messages;

CREATE POLICY "channel_messages_service_all" ON public.channel_messages
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
