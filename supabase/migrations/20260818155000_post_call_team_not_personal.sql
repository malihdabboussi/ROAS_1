-- Post-call bot: Team + Client run. Personal stays confidential.
-- Also relabel automatic "Team weekly / launch calendar" calls that Fathom
-- recorded as Personal because only one speaker was tagged.

BEGIN;

UPDATE public.space_automations
SET
  actions = (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'type' = 'request_slack_follow_up_confirm'
         AND COALESCE(elem->>'meeting_scope', 'client') = 'client'
        THEN jsonb_set(elem, '{meeting_scope}', '"client_and_team"')
        ELSE elem
      END
    )
    FROM jsonb_array_elements(actions) AS elem
  ),
  updated_at = now()
WHERE name = 'Fathom Meeting Log'
  AND actions::text LIKE '%request_slack_follow_up_confirm%';

UPDATE public.space_items
SET
  custom_data = jsonb_set(custom_data, '{call_kind}', '"team"'),
  updated_at = now()
WHERE custom_data->>'call_kind' = 'private'
  AND COALESCE(custom_data->>'call_kind_source', 'automatic') = 'automatic'
  AND (
    title ~* '(^|[[:space:]])team[[:space:]]+(weekly|sync|review|meeting|call|huddle)'
    OR title ~* 'team weekly'
    OR title ~* 'launch calendar'
  )
  AND title !~* 'team members?';

DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.space_automations,
         jsonb_array_elements(actions) AS elem
    WHERE name = 'Fathom Meeting Log'
      AND enabled = true
      AND elem->>'type' = 'request_slack_follow_up_confirm'
      AND COALESCE(elem->>'meeting_scope', '') IS DISTINCT FROM 'client_and_team'
  ) THEN
    RAISE EXCEPTION 'Enabled Fathom Meeting Log still uses a client-only post-call scope';
  END IF;
END
$verify$;

COMMIT;
