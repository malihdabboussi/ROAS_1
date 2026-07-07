/**
 * Mirrors context rules in apps/web/.../automation-catalog.ts so API publish
 * validation matches the automation builder.
 */
type AutomationContextKey = 'task' | 'contact' | 'artifact' | 'message' | 'form' | 'social_research'

const TRIGGER_CONTEXTS: Record<string, AutomationContextKey[]> = {
  status_change: ['task'],
  task_created: ['task'],
  mission_completed: ['task'],
  mission_failed: ['task'],
  field_changed: ['task'],
  priority_changed: ['task'],
  assignee_changed: ['task'],
  due_date_changed: ['task'],
  start_date_changed: ['task'],
  tag_added: ['task'],
  tag_removed: ['task'],
  form_submitted: ['form'],
  contact_created: ['contact'],
  contact_updated: ['contact'],
  contact_tag_added: ['contact'],
  contact_tag_removed: ['contact'],
  contact_type_changed: ['contact'],
  contact_source_changed: ['contact'],
  artifact_lifecycle: ['artifact'],
  external_email_received: ['message'],
  external_slack_message_received: ['message'],
  external_fathom_recording_ready: ['message'],
  external_app_event: ['message'],
  webhook_received: ['message'],
  schedule: [],
}

const ACTION_REQUIRED_CONTEXTS: Partial<Record<string, AutomationContextKey[]>> = {
  send_to_agent: ['task'],
  send_to_agents: ['task'],
  send_to_cursor: ['task'],
  add_brain_context_to_task: ['task'],
  assign_to: ['task'],
  change_status: ['task'],
  change_priority: ['task'],
  add_comment: ['task'],
  human_gate: ['task'],
  flow_loop: [],
  flow_branch: [],
  create_subtask: ['task'],
  update_contact_field: ['contact'],
  add_contact_tag: ['contact'],
  remove_contact_tag: ['contact'],
  attach_note_to_contact: ['contact'],
  link_item_to_contact: ['task'],
  publish_artifact: ['artifact'],
  unpublish_artifact: ['artifact'],
  ask_agent_to_improve_artifact: ['artifact'],
  attach_artifact_to_item: ['task', 'artifact'],
  select_social_outliers: ['social_research'],
  enrich_social_research_items: ['social_research'],
}

const ACTION_PRODUCED_CONTEXTS: Partial<Record<string, AutomationContextKey[]>> = {
  create_task: ['task'],
  create_contact: ['contact'],
  create_artifact: ['artifact'],
  sync_social_research: ['social_research'],
  select_social_outliers: ['social_research'],
  enrich_social_research_items: ['social_research'],
}

export function findFirstAutomationContextIssue(
  trigger: Record<string, unknown>,
  actions: Array<Record<string, unknown>>,
): { index: number; actionType: string; missing: AutomationContextKey[] } | null {
  const triggerType = String(trigger.type ?? '')
  const available = new Set(TRIGGER_CONTEXTS[triggerType] ?? [])
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    const actionType = String(action?.type ?? '')
    if (!actionType || actionType === 'choose_action') continue
    const required = ACTION_REQUIRED_CONTEXTS[actionType] ?? []
    const missing = required.filter((ctx) => !available.has(ctx))
    if (missing.length > 0) return { index: i, actionType, missing }
    for (const produced of ACTION_PRODUCED_CONTEXTS[actionType] ?? []) available.add(produced)
  }
  return null
}
