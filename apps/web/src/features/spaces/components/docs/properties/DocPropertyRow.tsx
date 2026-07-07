'use client'

import { useCallback, useRef } from 'react'
import { Eraser, EyeOff } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { SpaceItem } from '../../../types'
import type { FieldDef, SelectOption } from '../../../types/space-schema'
import { SpaceCell } from '../../cells/SpaceCell'
import { readFieldValue, toFieldPatch } from '../../space-item-values'
import { NON_CLEARABLE_FIELD_TYPES } from '../lib/field-type-icons'

export function DocPropertyRow({
  field,
  item,
  roster,
  currentUserId,
  onUpdate,
  onHide,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  statusField,
  allFields,
}: {
  field: FieldDef
  item: SpaceItem
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onUpdate: (patch: Partial<SpaceItem>) => void
  onHide: (fieldId: string) => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  statusField?: FieldDef
  allFields?: FieldDef[]
}) {
  const cellRef = useRef<HTMLDivElement>(null)

  const triggerCell = useCallback(() => {
    const trigger = cellRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [role="button"]:not([disabled]), input:not([disabled]):not([type="hidden"])',
    )
    trigger?.click()
  }, [])

  const raw = readFieldValue(item, field.id)
  const isEmpty =
    raw === null ||
    raw === undefined ||
    raw === '' ||
    (typeof raw === 'object' &&
      raw !== null &&
      'type' in raw &&
      (raw as { type: string }).type === 'unassigned')
  const clearable = !NON_CLEARABLE_FIELD_TYPES.has(field.type)

  return (
    <div
      className="group/prop flex min-h-[28px] cursor-pointer items-center rounded px-1 py-0.5 transition-colors hover:bg-[var(--color-hover-subtle)]"
      onClick={triggerCell}
    >
      <span className="w-[88px] shrink-0 truncate text-[11px] text-[var(--color-muted-foreground)]">
        {field.name}
      </span>
      <div ref={cellRef} className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
        <SpaceCell
          field={field}
          value={raw}
          onChange={(next) => onUpdate(toFieldPatch(item, field.id, next))}
          roster={roster}
          currentUserId={currentUserId}
          onEditStatuses={onEditStatuses}
          onEditCategories={onEditCategories}
          onCreateOption={onCreateOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          spaceItem={item}
          onItemPatch={onUpdate}
          statusField={statusField}
          allFields={allFields}
        />
      </div>
      <div className="ml-0.5 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/prop:opacity-100">
        {clearable && !isEmpty && (
          <Tooltip label="Clear value" side="top">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onUpdate(toFieldPatch(item, field.id, null))
              }}
              className="rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-muted-foreground)]"
            >
              <Eraser className="h-3 w-3" />
            </button>
          </Tooltip>
        )}
        <Tooltip label="Hide field" side="top">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onHide(field.id)
            }}
            className="rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-muted-foreground)]"
          >
            <EyeOff className="h-3 w-3" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
