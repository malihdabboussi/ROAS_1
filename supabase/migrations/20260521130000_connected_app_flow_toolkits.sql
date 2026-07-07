INSERT INTO public.project_composio_toolkit_config (integration_id, toolkit_slug, auth_config_id, auth_mode, enabled, metadata)
VALUES
  ('google_calendar', 'googlecalendar', 'ac_htGTG2nbiDbj', 'managed', true, '{}'::jsonb),
  ('google_sheets', 'googlesheets', 'ac_05xLR9LJSE1a', 'managed', true, '{}'::jsonb),
  ('hubspot', 'hubspot', 'ac_7Fb92ziBJoeH', 'managed', true, '{}'::jsonb),
  ('salesforce', 'salesforce', 'ac_O-QgeIkj0Ta4', 'managed', true, '{}'::jsonb),
  ('notion', 'notion', 'ac_85kYWqt6wlkq', 'managed', true, '{}'::jsonb)
ON CONFLICT (integration_id) DO UPDATE SET
  toolkit_slug = EXCLUDED.toolkit_slug,
  auth_config_id = EXCLUDED.auth_config_id,
  auth_mode = EXCLUDED.auth_mode,
  enabled = EXCLUDED.enabled,
  metadata = EXCLUDED.metadata,
  updated_at = now();
