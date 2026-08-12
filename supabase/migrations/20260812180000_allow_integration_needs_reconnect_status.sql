-- Allow 'needs_reconnect' in user_integrations.status.
-- The API already writes this status (Composio webhook/health, Fathom OAuth),
-- and production had this constraint applied out-of-band on 2026-08-12 audit;
-- this migration brings the repo migration chain into parity. Idempotent.

ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_status_check;

ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_status_check
  CHECK (
    status IN (
      'pending',
      'connected',
      'needs_reconnect',
      'error',
      'disconnected'
    )
  );
