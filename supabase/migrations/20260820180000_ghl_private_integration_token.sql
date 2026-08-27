UPDATE integrations_available
SET
  auth_type = 'api_key',
  description = 'Connect GoHighLevel with a Private Integration Token for CRM, email, and automations.',
  updated_at = now()
WHERE id = 'gohighlevel';
