'use client'

import { SelectCell } from '@/components/spaces/cells/SelectCell'
import { OptionDot } from '@/components/ui/status/OptionBadge'
import { Tooltip } from '@/components/ui/tooltip'
import { formatNotificationStatusLabel } from '@/lib/notifications'
import {
  resolveMissionSubtaskStatusDotColor,
  resolveStatusDotColorFromId,
  resolveStatusLabelFromId,
  type FieldDef,
} from '@/lib/spaces'
import type { YourTurnItem } from '@/lib/your-turn/types'

export function MyTasksInlineStatus({
  item,
  statusField,
  status,
  onChanged,
}: {
  item: YourTurnItem
  statusField: FieldDef | null | undefined
  status: string
  onChanged: (status: string) => void
}) {
  const label =
    item.kind === 'mission_subtask'
      ? formatNotificationStatusLabel(status)
      : resolveStatusLabelFromId(status, statusField)
  const color =
    item.kind === 'mission_subtask'
      ? resolveMissionSubtaskStatusDotColor(status)
      : resolveStatusDotColorFromId(status, statusField)

  if (item.kind !== 'space_item' || !item.space_id || !statusField) {
    return (
      <Tooltip label={label} side="top">
        <span className="inline-flex shrink-0">
          <OptionDot color={color} size="sm" />
        </span>
      </Tooltip>
    )
  }

  return (
    <span
      className="inline-flex shrink-0"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <SelectCell
        field={statusField}
        value={status}
        triggerInline
        customTrigger={
          <span className="button-compact button-glass-neutral gap-spacing-1 inline-flex max-w-28 items-center">
            <OptionDot color={color} size="sm" />
            <span className="truncate">{label}</span>
          </span>
        }
        onChange={(value) => {
          const nextStatus = typeof value === 'string' ? value : ''
          if (nextStatus && nextStatus !== status) onChanged(nextStatus)
        }}
      />
    </span>
  )
}
