import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { DuplicateSpaceItemInclude } from '../../services/spaces.service'
import type { Space, SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'

export interface BulkActionBarProps {
  selectedIds: Set<string>
  items: SpaceItem[]
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  spaces: Space[]
  activeSpaceId: string | null
  onUpdateItem: (
    id: string,
    patch: Partial<SpaceItem>,
    options?: { skipSubtaskCompleteConfirm?: boolean },
  ) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onCreateItem: (title: string, extra?: Record<string, unknown>) => Promise<SpaceItem | null>
  onClearSelection: () => void
  onRefresh: () => Promise<void>
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onPushToAgent?: (itemId: string, options?: MissionSendOptions) => Promise<void>
  duplicateItem: (
    spaceId: string,
    itemId: string,
    input: { include: DuplicateSpaceItemInclude; title?: string },
  ) => Promise<SpaceItem | null>
  itemKind?: 'task' | 'doc'
}
