begin;

-- A client workspace contains both teammates and customers. An unmatched Slack identity must not
-- become eligible for proactive delivery merely because it is a full workspace member.
update public.channel_members
set
  relationship_kind = 'external',
  updated_at = now()
where platform = 'slack'
  and relationship_source = 'inferred'
  and relationship_kind = 'internal'
  and vibey_user_id is null
  and contact_id is null;

-- Re-route unsent findings for identities made external by the safer inference rule.
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

-- A Team-loop action with no internal recipient is an internal finding, never a message proposal.
update public.slack_shadow_actions
set
  action_kind = 'workflow',
  updated_at = now()
where target_member_id is null
  and workflow_key like 'slack_team:%'
  and action_kind <> 'workflow';

-- Older findings stored technical ids only. Snapshot readable, immutable evidence on the action so
-- review remains understandable even if Slack later renames a channel or person.
update public.slack_shadow_actions as action
set
  proposed_content = replace(
    action.proposed_content,
    coalesce(event.sender_slack_user_id, ''),
    coalesce(nullif(person.display_name, ''), event.sender_slack_user_id, '')
  ),
  rationale = case
    when action.rationale is null then null
    else replace(
      action.rationale,
      coalesce(event.sender_slack_user_id, ''),
      coalesce(nullif(person.display_name, ''), event.sender_slack_user_id, '')
    )
  end,
  metadata = coalesce(action.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'source_channel_name', event.channel_name,
    'source_sender_display_name', coalesce(nullif(person.display_name, ''), event.sender_slack_user_id),
    'source_sender_slack_user_id', event.sender_slack_user_id,
    'source_message_text', event.text,
    'source_thread_ts', coalesce(event.thread_ts, event.message_ts),
    'source_slack_team_id', event.slack_team_id
  )),
  updated_at = now()
from public.slack_observation_events as event
left join public.channel_members as person
  on person.org_id = event.org_id
 and person.platform = 'slack'
 and person.platform_id = event.sender_slack_user_id
where action.org_id = event.org_id
  and action.source_channel_id = event.channel_id
  and action.source_message_ts = event.message_ts
  and action.workflow_key like 'slack_team:%';

commit;
