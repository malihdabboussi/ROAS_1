-- Standalone email artifacts: allow draft | ready | sent (parity with sequence_emails lifecycle labels).

ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS emails_status_check;
ALTER TABLE public.emails ADD CONSTRAINT emails_status_check
  CHECK (status IN ('draft', 'ready', 'sent'));
