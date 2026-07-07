'use client'

import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'
import { BulkActionBar } from '../BulkActionBar'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'

interface TaskSubtasksBulkActionsProps {
  allFields: FieldDef[]
  currentUserId: string | null
  items: SpaceItem[]
  roster: TeamRosterEntry[]
  selectedIds: Set<string>
  onClearSelection: () => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  onEditCategories?: () => void
  onEditStatuses?: () => void
  onRefresh?: () => Promise<void>
  onUpdateSubtask: (subtaskId: string, patch: Partial<SpaceItem>) => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
}

export function TaskSubtasksBulkActions({
  allFields,
  currentUserId,
  items,
  roster,
  selectedIds,
  onClearSelection,
  onDeleteItem,
  onEditCategories,
  onEditStatuses,
  onRefresh,
  onUpdateSubtask,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onPushToAgent,
}: TaskSubtasksBulkActionsProps) {
  const store = useSpacesStore.getState()

  return (
    <BulkActionBar
      selectedIds={selectedIds}
      items={items}
      allFields={allFields}
      roster={roster}
      currentUserId={currentUserId}
      spaces={store.spaces}
      activeSpaceId={store.activeSpaceId}
      onUpdateItem={async (id, patch) => onUpdateSubtask(id, patch)}
      onDeleteItem={async (id) => {
        await onDeleteItem(id)
      }}
      onCreateItem={store.createItem}
      onClearSelection={onClearSelection}
      onRefresh={onRefresh ?? (async () => {})}
      onEditStatuses={onEditStatuses}
      onEditCategories={onEditCategories}
      onCreateOption={onCreateOption}
      onUpdateOption={onUpdateOption}
      onDeleteOption={onDeleteOption}
      onTagCustomSwatchesChange={onTagCustomSwatchesChange}
      onPushToAgent={onPushToAgent}
      duplicateItem={store.duplicateItem}
    />
  )
}
