-- =============================================================================
-- Security advisors phase 2: drop dead tables (user-approved)
-- =============================================================================
-- All four tables have:
--   - zero inbound foreign keys (verified via pg_constraint)
--   - zero dependent views / functions / triggers (verified via pg_depend)
--   - zero application code references (verified via grep across the monorepo)
--
-- system_agent_cleanup_backup_*: rollback snapshots from
--   20260507135600_system_agent_07_delete_clones (May 7). 6 days clean in prod;
--   user confirms the cleanup is permanent.
--
-- pending_channel_messages: abandoned Slack/Telegram outbound retry queue.
--   Last write 2026-04-08, 5 stale rows, no code references anywhere in repo.

DROP TABLE IF EXISTS public.system_agent_cleanup_backup_skills;
DROP TABLE IF EXISTS public.system_agent_cleanup_backup_definitions;
DROP TABLE IF EXISTS public.system_agent_cleanup_backup_resources;
DROP TABLE IF EXISTS public.pending_channel_messages;
