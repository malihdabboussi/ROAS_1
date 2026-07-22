import type { SpaceSchema } from './space-schema'

export * from './space-schema'
export type {
  AssigneeType,
  CustomUnit,
  ListItem,
  ListItemPriority,
  ListItemSource,
  ListItemStatus,
  MonthlyAnchor,
  RecurrenceCloneInclude,
  RecurrenceEnd,
  RecurrenceFrequency,
  RecurrenceMode,
  RecurrenceResetStatus,
  RecurrenceSpec,
  RecurrenceTrigger,
  RecurrenceTriggerStatus,
  SpaceItem,
  SpaceItemAssignee,
  SpaceItemPriority,
  SpaceItemRealtimeChange,
  SpaceItemSource,
  SpaceItemStatus,
} from '@/lib/spaces/space-item-types'

export interface Space {
  id: string
  org_id: string | null
  user_id: string
  title: string
  description: string | null
  campaign_id: string | null
  is_template: boolean
  visibility: 'private' | 'team'
  space_kind?: 'standard' | 'personal_dashboard'
  share_link_enabled?: boolean
  share_token?: string | null
  share_meta?: {
    level: 'admin' | 'edit' | 'view'
    allowed_view_ids: string[] | null
  }
  /** Effective level for the current viewer (returned by GET /spaces/:id). */
  effective_level?: 'admin' | 'edit' | 'view' | null
  /** True iff the current viewer can delete the entire space (org admin/owner). */
  can_delete_space?: boolean
  schema: SpaceSchema
  created_at: string
  updated_at: string
}

// Backward-compatible aliases while the rename lands across the app.
export type List = Space
