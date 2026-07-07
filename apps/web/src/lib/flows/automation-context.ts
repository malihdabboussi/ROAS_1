export type AutomationContextKey =
  | 'task'
  | 'contact'
  | 'artifact'
  | 'message'
  | 'form'
  | 'social_research'

export type AutomationTriggerContextLike = {
  type: string
}

export type AutomationActionContextLike = {
  type: string
}

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

export function contextsForTrigger(
  trigger: AutomationTriggerContextLike,
): Set<AutomationContextKey> {
  return new Set(TRIGGER_CONTEXTS[trigger.type] ?? [])
}

export function actionRequiredContexts(actionType: string): AutomationContextKey[] {
  return ACTION_REQUIRED_CONTEXTS[actionType] ?? []
}

export function actionProducedContexts(actionType: string): AutomationContextKey[] {
  return ACTION_PRODUCED_CONTEXTS[actionType] ?? []
}

export function hasRequiredContexts(
  available: Set<AutomationContextKey>,
  actionType: string,
): boolean {
  return actionRequiredContexts(actionType).every((context) => available.has(context))
}

export function deriveContextsAfterActions(
  trigger: AutomationTriggerContextLike,
  actions: AutomationActionContextLike[],
  beforeIndex: number,
): Set<AutomationContextKey> {
  const available = contextsForTrigger(trigger)
  for (let index = 0; index < beforeIndex; index++) {
    const action = actions[index]
    if (!action || action.type === 'choose_action') continue
    if (!hasRequiredContexts(available, action.type)) continue
    for (const produced of actionProducedContexts(action.type)) available.add(produced)
  }
  return available
}

export function findFirstContextIssue(
  trigger: AutomationTriggerContextLike,
  actions: AutomationActionContextLike[],
): { index: number; actionType: string; missing: AutomationContextKey[] } | null {
  const available = contextsForTrigger(trigger)
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index]
    if (!action || action.type === 'choose_action') continue
    const missing = actionRequiredContexts(action.type).filter((context) => !available.has(context))
    if (missing.length > 0) return { index, actionType: action.type, missing }
    for (const produced of actionProducedContexts(action.type)) available.add(produced)
  }
  return null
}
