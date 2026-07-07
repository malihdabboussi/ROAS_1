'use client'

import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { selectOptionControlChrome } from '../../lib/space-group-badge-glass'
import {
  isTerminalStatusOption,
  nextWorkflowStatusOption,
  resolveDoneStatusOption,
} from '../../lib/status-categories'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'
import { SelectCell } from '../cells/SelectCell'
import { toFieldPatch } from '../space-item-values'
import { CELL, STATUS_BG, STATUS_DIVIDER } from './task-meta-fields-helpers'

interface TaskMetaStatusFieldProps {
  item: SpaceItem
  statusField: FieldDef | undefined
  statusValue: string
  statusOption: SelectOption | null
  onUpdateField: (patch: Partial<SpaceItem>) => void
  onEditStatuses?: () => void
}

export function TaskMetaStatusField({
  item,
  statusField,
  statusValue,
  statusOption,
  onUpdateField,
  onEditStatuses,
}: TaskMetaStatusFieldProps) {
  if (!statusField) return null

  const opts = statusField.options ?? []
  const doneOpt = resolveDoneStatusOption(opts)
  const nextOpt = nextWorkflowStatusOption(opts, statusValue)
  const currentStatusOption = opts.find((o) => o.id === statusValue)
  const isDone = currentStatusOption ? isTerminalStatusOption(currentStatusOption) : false
  const color = statusOption?.color ?? 'slate'
  const mappedBg = STATUS_BG[color]
  const surface = mappedBg
    ? {
        pillClass: mappedBg,
        pillStyle: undefined,
        dividerClass: STATUS_DIVIDER[color] ?? 'border-[var(--color-border)]',
        dividerStyle: undefined,
      }
    : selectOptionControlChrome(color)

  return (
    <div className={CELL}>
      <div
        className={cn('flex items-stretch overflow-hidden rounded-lg', surface.pillClass)}
        style={surface.pillStyle}
      >
        <SelectCell
          field={statusField}
          value={statusValue}
          onChange={(next) => onUpdateField(toFieldPatch(item, 'status', next))}
          onEditStatuses={onEditStatuses}
          customTrigger={
            <span className="body-2 flex items-center gap-1.5 px-2.5 py-0 font-semibold uppercase">
              {statusOption?.label ?? 'None'}
            </span>
          }
        />
        {nextOpt && !isDone && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onUpdateField(toFieldPatch(item, 'status', nextOpt.id))
            }}
            className={cn(
              'flex items-center border-l px-1.5 transition-opacity hover:opacity-80',
              surface.dividerClass,
            )}
            style={surface.dividerStyle}
            title={`Move to ${nextOpt.label}`}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        {doneOpt && !isDone && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onUpdateField(toFieldPatch(item, 'status', doneOpt.id))
            }}
            className={cn(
              'flex items-center border-l px-1.5 transition-opacity hover:opacity-80',
              surface.dividerClass,
            )}
            style={surface.dividerStyle}
            title="Mark as done"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
