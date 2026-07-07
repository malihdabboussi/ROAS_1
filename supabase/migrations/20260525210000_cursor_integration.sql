INSERT INTO public.integrations_available (id, provider, name, description, auth_type, is_available, metadata)
VALUES (
  'cursor',
  'cursor',
  'Cursor',
  'AI coding agent that opens PRs on your behalf',
  'api_key',
  true,
  jsonb_build_object(
    'docs_url', 'https://cursor.com/docs/cloud-agent/api/endpoints',
    'supports_webhooks', true
  )
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  updated_at = now();

CREATE INDEX IF NOT EXISTS idx_user_integrations_cursor
  ON public.user_integrations (user_id, org_id)
  WHERE integration_id = 'cursor';

CREATE INDEX IF NOT EXISTS idx_space_items_cursor_agent
  ON public.space_items ((custom_data ->> 'cursor_agent_id'))
  WHERE custom_data ? 'cursor_agent_id';

CREATE TABLE IF NOT EXISTS public.cursor_webhook_events (
  webhook_id TEXT PRIMARY KEY,
  agent_id TEXT,
  event_type TEXT,
  status TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cursor_webhook_events ENABLE ROW LEVEL SECURITY;
