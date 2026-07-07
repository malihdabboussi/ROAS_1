'use client'

import { cn } from '@/lib/utils/cn'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { MissionSendOptions } from '../../components/cells/MissionSendDropdown'
import {
  GroupedRowGripColumn,
  SPACE_LIST_ROW_SELECTED_TINT,
} from '../../components/space-list-group-chrome'
import { SpaceItemRow } from '../../components/SpaceItemRow'
import type { SpaceItem } from '../../types'
import type { DateDisplayFormats, FieldDef, SelectOption } from '../../types/space-schema'

export interface SpaceCalendarDayTaskRowProps {
  item: SpaceItem
  isSelected: boolean
  readOnly: boolean
  displayCols: FieldDef[]
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  gridTemplateColumns: string
  dateDisplayFormats: DateDisplayFormats
  onUpdateItem: (itemId: string, payload: Partial<SpaceItem>) => Promise<void>
  onDeleteItem: (itemId: string) => void | Promise<void>
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
  onOpenDetail?: (item: SpaceItem) => void
  onToggleSelect: (id: string) => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
}

export function SpaceCalendarDayTaskRow({
  item,
  isSelected,
  readOnly,
  displayCols,
  allFields,
  roster,
  currentUserId,
  gridTemplateColumns,
  dateDisplayFormats,
  onUpdateItem,
  onDeleteItem,
  onPushToAgent,
  onOpenDetail,
  onToggleSelect,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onEditStatuses,
  onEditCategories,
}: SpaceCalendarDayTaskRowProps) {
  return (
    <div className="group/row relative">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-none',
          isSelected ? SPACE_LIST_ROW_SELECTED_TINT : 'group-hover/row:bg-[var(--color-hover-subtle)]',
        )}
        aria-hidden
      />
      <div className="relative flex min-w-0 items-stretch">
        <GroupedRowGripColumn
          itemId={item.id}
          isSelected={isSelected}
          onToggleSelect={readOnly ? undefined : onToggleSelect}
          dndDrag={undefined}
          hideGrip
          surface="list"
        />
        <div className="min-w-0 flex-1 pr-4">
          <SpaceItemRow
            item={item}
            visibleFields={displayCols}
            allFields={allFields}
            roster={roster}
            currentUserId={currentUserId}
            onUpdateItem={onUpdateItem}
            onPushToAgent={onPushToAgent}
            onOpenDetail={onOpenDetail}
            groupColor="muted"
            onEditStatuses={onEditStatuses}
            onEditCategories={onEditCategories}
            selected={isSelected}
            onToggleSelect={undefined}
            gridTemplateColumns={gridTemplateColumns}
            subtaskCount={0}
            suppressSubtaskChevron
            isSubtask={Boolean(item.parent_item_id)}
            onCreateOption={onCreateOption}
            onUpdateOption={onUpdateOption}
            onDeleteOption={onDeleteOption}
            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
            onDeleteItem={onDeleteItem}
            surface="list"
            readOnly={readOnly}
            dateDisplayFormats={dateDisplayFormats}
          />
        </div>
      </div>
    </div>
  )
}
