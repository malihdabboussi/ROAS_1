-- tg_human_dm_msg_after_insert was added by 20260513120000_dm_channels.sql.
-- It's a SECURITY DEFINER trigger function (return_type=trigger), which never
-- needs EXECUTE for anon/authenticated/public - it fires implicitly on INSERT.
-- Same fix pattern as the 6 trigger functions locked down in phase 1.
REVOKE EXECUTE ON FUNCTION public.tg_human_dm_msg_after_insert() FROM PUBLIC, anon, authenticated;
