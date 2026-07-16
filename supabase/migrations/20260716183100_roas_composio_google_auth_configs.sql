-- ROAS Composio project had zero auth configs; prior IDs were Vibey leftovers (404).
-- Re-seed managed OAuth auth configs created in the ROAS Composio project.

UPDATE public.project_composio_toolkit_config
SET
  auth_config_id = CASE integration_id
    WHEN 'airtable' THEN 'ac_tKlXONuVsPQD'
    WHEN 'github' THEN 'ac_Ed0QabVM4Q30'
    WHEN 'google_calendar' THEN 'ac_jfvYHDrRDJ6C'
    WHEN 'google_drive' THEN 'ac_9ysawbOQ8Fej'
    WHEN 'google_sheets' THEN 'ac_fCf1iZg8rG28'
    WHEN 'hubspot' THEN 'ac_mTaqeo2KhsnN'
    WHEN 'instagram' THEN 'ac_Ezl8YnRMOMTM'
    WHEN 'linkedin' THEN 'ac_xsJS0Gv-z4nn'
    WHEN 'notion' THEN 'ac_jIhtuMLpjvzM'
    WHEN 'outlook' THEN 'ac_neupkaOcAbPV'
    WHEN 'salesforce' THEN 'ac_FJ_eQafbbRQd'
    WHEN 'youtube' THEN 'ac_LGQCWiZn3piO'
    WHEN 'zoom' THEN 'ac_CXDifcJcqCqE'
    ELSE auth_config_id
  END,
  enabled = true,
  auth_mode = 'managed',
  updated_at = now()
WHERE integration_id IN ('airtable', 'github', 'google_calendar', 'google_drive', 'google_sheets', 'hubspot', 'instagram', 'linkedin', 'notion', 'outlook', 'salesforce', 'youtube', 'zoom');

