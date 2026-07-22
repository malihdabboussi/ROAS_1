BEGIN;

WITH updated AS (
  SELECT
    automation.id,
    jsonb_agg(
      CASE
        WHEN action.value ->> 'type' = 'request_slack_follow_up_confirm'
          AND NOT (action.value ? 'delivery_mode')
        THEN action.value || jsonb_build_object('delivery_mode', 'shadow')
        ELSE action.value
      END
      ORDER BY action.ordinality
    ) AS actions
  FROM public.space_automations automation
  CROSS JOIN LATERAL jsonb_array_elements(automation.actions)
    WITH ORDINALITY AS action(value, ordinality)
  WHERE automation.actions @> '[{"type":"request_slack_follow_up_confirm"}]'::jsonb
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(automation.actions) AS candidate(value)
      WHERE candidate.value ->> 'type' = 'request_slack_follow_up_confirm'
        AND NOT (candidate.value ? 'delivery_mode')
    )
  GROUP BY automation.id
)
UPDATE public.space_automations automation
SET actions = updated.actions, updated_at = now()
FROM updated
WHERE automation.id = updated.id;

COMMIT;
