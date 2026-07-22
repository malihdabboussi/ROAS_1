-- Proactive Slack findings about external people are internal review signals,
-- never outbound message proposals addressed to the external person.
update public.slack_shadow_actions as action
set
  target_member_id = null,
  action_kind = 'workflow',
  metadata = coalesce(action.metadata, '{}'::jsonb) || jsonb_build_object(
    'internal_only', true,
    'subject_member_id', person.id,
    'subject_display_name', person.display_name,
    'subject_relationship_kind', person.relationship_kind
  ),
  updated_at = now()
from public.channel_members as person
where action.target_member_id = person.id
  and person.relationship_kind <> 'internal'
  and action.workflow_key like 'slack_team:%'
  and action.status in ('proposed', 'approved', 'failed');
