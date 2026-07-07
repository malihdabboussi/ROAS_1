export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'url'
  | 'media'
  | 'assignee'
  | 'contact'
  | 'checkbox'
  | 'currency'
  | 'email'
  | 'phone'
  | 'rating'
  | 'progress'
  | 'duration'
  | 'created_at'
  | 'updated_at'
  | 'mission'

export type StatusCategory = 'not_started' | 'active' | 'done' | 'closed'

export interface SelectOption {
  id: string
  label: string
  color?: string
  group?: StatusCategory
}

export interface FieldDef {
  id: string
  name: string
  type: FieldType
  options?: SelectOption[]
  /**
   * User-added color presets for the tag color popover (hex or linear-gradient), persisted in space schema.
   */
  tag_custom_swatches?: string[]
  system?: boolean
  required?: boolean
}

export type MissionGroupBy = 'status' | 'priority' | 'assignee' | 'created_at' | 'updated_at'

export type MissionColumnId =
  | 'title'
  | 'campaign'
  | 'assigned'
  | 'working'
  | 'status'
  | 'progress'
  | 'updated'
  | 'priority'
  | 'subtasks'
  | 'created'
  | 'documents'
  | 'media'
  | 'artifacts'

/** How list/board/mission views show subtasks (toolbar + customize). */
export type SubtasksDisplayMode = 'collapsed' | 'expanded' | 'separate'

export interface MissionsConfig {
  group_by?: MissionGroupBy
  group_sort?: 'asc' | 'desc'
  visible_columns?: MissionColumnId[]
  show_empty_groups?: boolean
  show_closed?: boolean
  /** Toolbar: show only missions owned by the current user. */
  toolbar_assigned_to_me?: boolean
  /** Toolbar: filter to missions whose `assigned_agent_key` is in this set. */
  toolbar_filter_agent_keys?: string[]
  subtasks_expanded?: boolean
  subtasks_display?: SubtasksDisplayMode
  /** Progress column: show done/total next to the bar; default true. */
  progress_show_number?: boolean
  /** Bar fill: preset id, hex, or gradient; null uses blue / emerald by completion. */
  progress_bar_fill?: string | null
  /** Desktop missions list column widths (px), keyed by `MissionColumnId`. */
  list_column_widths?: Record<string, number>
}
