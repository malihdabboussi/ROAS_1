-- Seed integrations_available rows for Composio toolkits that already have
-- project_composio_toolkit_config entries. Without these, user_integrations
-- inserts fail FK user_integrations_integration_id_fkey.

INSERT INTO public.integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES
  (
    'google_calendar',
    'google_calendar',
    'Google Calendar',
    'Connect Google Calendar to manage events, schedules, and availability.',
    'oauth2',
    true,
    jsonb_build_object('managed_by', 'composio')
  ),
  (
    'google_sheets',
    'google_sheets',
    'Google Sheets',
    'Connect Google Sheets to read and write spreadsheet data.',
    'oauth2',
    true,
    jsonb_build_object('managed_by', 'composio')
  ),
  (
    'hubspot',
    'hubspot',
    'HubSpot',
    'Connect HubSpot to sync CRM contacts, deals, and company data.',
    'oauth2',
    true,
    jsonb_build_object('managed_by', 'composio')
  ),
  (
    'notion',
    'notion',
    'Notion',
    'Connect Notion to read and update pages, databases, and workspace content.',
    'oauth2',
    true,
    jsonb_build_object('managed_by', 'composio')
  ),
  (
    'salesforce',
    'salesforce',
    'Salesforce',
    'Connect Salesforce to sync CRM records, opportunities, and account data.',
    'oauth2',
    true,
    jsonb_build_object('managed_by', 'composio')
  )
ON CONFLICT (id) DO UPDATE
SET
  provider = EXCLUDED.provider,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata,
  updated_at = now();
