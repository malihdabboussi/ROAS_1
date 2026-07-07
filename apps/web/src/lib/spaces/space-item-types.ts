export type BuiltInSpaceItemStatus =
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'needs_revision'
  | 'done'
  | 'archived'
export type SpaceItemStatus = BuiltInSpaceItemStatus | (string & {})
export type SpaceItemPriority = 'low' | 'medium' | 'high' | 'urgent' | null
export type AssigneeType = 'human' | 'agent' | 'unassigned'

export interface SpaceItemAssignee {
  type: Exclude<AssigneeType, 'unassigned'>
  id: string
}

export type SpaceItemSource = 'manual' | 'agent' | 'agent_suggested' | 'template' | 'fathom'
export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'days_after'
  | 'custom'
export type RecurrenceTrigger = 'status_change' | 'due_date'
export type RecurrenceTriggerStatus = 'done' | 'in_review'
export type RecurrenceMode = 'create_task' | 'update_status'
/** Space status option id to apply when the recurring cycle resets the same item. */
export type RecurrenceResetStatus = string

/** What to copy when recurrence creates a new space item. */
export interface RecurrenceCloneInclude {
  include_everything?: boolean
  description?: boolean
  assignee?: boolean
  priority?: boolean
  tags?: boolean
  custom_fields?: boolean
  subtasks?: boolean
}

export type MonthlyAnchor = 'same_day' | 'nth_weekday' | 'first_day' | 'last_day'
export type CustomUnit = 'day' | 'week' | 'month' | 'year'

export type RecurrenceEnd =
  | { type: 'forever' }
  | { type: 'count'; count: number }
  | { type: 'until'; until: string }

export interface RecurrenceSpec {
  frequency: RecurrenceFrequency
  interval: number
  weekdays?: number[]
  trigger: RecurrenceTrigger
  trigger_status?: RecurrenceTriggerStatus
  /** @deprecated Infer from create_new_task / update_same_item; kept for older saved JSON. */
  mode?: RecurrenceMode
  /** When true, materialize inserts a new row for the next occurrence. */
  create_new_task?: boolean
  /** When true, the recurring row is updated in place for the next cycle. */
  update_same_item?: boolean
  /** Status id for newly created rows. */
  new_instance_status?: string
  /** Status id applied to the same row when update_same_item is true. */
  reset_status?: RecurrenceResetStatus
  /** Field copy options for create_new_task. */
  clone_include?: RecurrenceCloneInclude
  sync_to_due_date: boolean
  end: RecurrenceEnd
  skip_weekends?: boolean
  monthly_anchor?: MonthlyAnchor
  days_after_count?: number
  custom_unit?: CustomUnit
  occurrences_created?: number
  last_materialized_at?: string
}

export interface SpaceItem {
  id: string
  space_id: string
  org_id: string
  user_id: string
  title: string
  status: SpaceItemStatus
  priority: SpaceItemPriority
  assignee_type: AssigneeType
  assignee_id: string | null
  assignees: SpaceItemAssignee[]
  start_date: string | null
  due_date: string | null
  recurrence: RecurrenceSpec | null
  parent_item_id: string | null
  recurrence_parent_id: string | null
  description: string | null
  notes: string | null
  doc_body: string | null
  source: SpaceItemSource
  linked_mission_id: string | null
  form_id: string | null
  task_execution_status: 'running' | 'done' | 'failed' | 'cancelled' | null
  is_private: boolean
  share_link_enabled: boolean
  share_token: string | null
  sort_order: number
  custom_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type SpaceItemRealtimeChange =
  | { type: 'upsert'; item: SpaceItem }
  | { type: 'delete'; itemId: string }

export type ListItemStatus = SpaceItemStatus
export type ListItemPriority = SpaceItemPriority
export type ListItemSource = SpaceItemSource
export type ListItem = SpaceItem
