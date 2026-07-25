-- Add orthogonal Inbox triage state without coupling it to read state.
ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS inbox_bucket TEXT,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;

ALTER TABLE public.user_notifications
  ALTER COLUMN inbox_bucket DROP DEFAULT;

ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_inbox_bucket_check;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_inbox_bucket_check
  CHECK (inbox_bucket = ANY (ARRAY['primary', 'other']));

CREATE OR REPLACE FUNCTION public.user_notification_default_bucket(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_type = ANY (ARRAY[
      'space_task_mention',
      'space_task_assigned',
      'space_task_comment',
      'human_dm_message',
      'plan_approval_required',
      'human_subtask_awaiting',
      'human_subtask_sla_escalated',
      'org_invitation',
      'mission_blocked',
      'mission_failed',
      'subtask_blocked'
    ]) THEN 'primary'
    ELSE 'other'
  END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_notification_default_bucket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.inbox_bucket IS NULL THEN
    NEW.inbox_bucket := public.user_notification_default_bucket(NEW.type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_notification_default_bucket
  ON public.user_notifications;

CREATE TRIGGER set_user_notification_default_bucket
BEFORE INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_user_notification_default_bucket();

UPDATE public.user_notifications
SET inbox_bucket = public.user_notification_default_bucket(type);

ALTER TABLE public.user_notifications
  ALTER COLUMN inbox_bucket SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_inbox
  ON public.user_notifications
  (user_id, org_id, inbox_bucket, cleared_at, snoozed_until, created_at DESC);

-- One RLS-enforced query returns every unread tab count.
CREATE OR REPLACE FUNCTION public.user_notification_inbox_counts(
  p_user_id UUID,
  p_org_id UUID DEFAULT NULL
)
RETURNS TABLE(view TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH scoped AS (
    SELECT inbox_bucket, snoozed_until, cleared_at
    FROM public.user_notifications
    WHERE user_id = p_user_id
      AND (
        (p_org_id IS NULL AND org_id IS NULL)
        OR org_id = p_org_id
      )
      AND read_at IS NULL
  )
  SELECT 'primary', count(*)
  FROM scoped
  WHERE cleared_at IS NULL
    AND (snoozed_until IS NULL OR snoozed_until <= now())
    AND inbox_bucket = 'primary'
  UNION ALL
  SELECT 'other', count(*)
  FROM scoped
  WHERE cleared_at IS NULL
    AND (snoozed_until IS NULL OR snoozed_until <= now())
    AND inbox_bucket = 'other'
  UNION ALL
  SELECT 'later', count(*)
  FROM scoped
  WHERE cleared_at IS NULL AND snoozed_until > now()
  UNION ALL
  SELECT 'cleared', count(*)
  FROM scoped
  WHERE cleared_at IS NOT NULL;
$$;
