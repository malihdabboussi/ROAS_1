-- Team Agenda pulls Workspace Directory calendars unless rejected.
-- Person-link match_status was incorrectly gating DWD calendar inclusion;
-- Directory users default to confirmed so Sync Directory alone is enough.
UPDATE public.org_person_calendar_identities
SET
  match_status = 'confirmed',
  match_method = COALESCE(NULLIF(match_method, ''), 'directory_sync'),
  updated_at = NOW()
WHERE source = 'directory_sync'
  AND google_workspace_user_id IS NOT NULL
  AND match_status IN ('unmatched', 'suggested');
