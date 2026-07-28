import type { TeamRosterEntry } from '@/lib/team'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption, SpaceSchema, ViewDef } from '../../types/space-schema'

export interface TaskDetailModalProps {
  presentation?: 'modal' | 'panel'
  item: SpaceItem
  allFields: FieldDef[]
  activeView: ViewDef
  spaceSchema: SpaceSchema
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  roster: TeamRosterEntry[]
  currentUserId: string | null
  campaignId: string | null
  /** Parent crumb when viewing a drilled-in subtask (stack from `pushTaskAndOpen` / `openSpaceItemModal`). */
  breadcrumbParentCrumb?: { committedTitle: string; onNavigate: () => void } | null
  /** Show a back arrow on the breadcrumb when this modal was opened from another task. */
  canGoBack?: boolean
  /** Pop the back stack and reopen the previous task. */
  onBack?: () => void
  /** Open another task (e.g. from a clicked task mention chip in the activity timeline). */
  onOpenTaskByItem?: (item: SpaceItem) => void
  /** Open a tagged conversation in space chat (e.g. from activity @@ mention chip). */
  onOpenConversationById?: (conversationId: string) => void
  onClose: () => void
  onUpdated: () => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
}
