'use client'

import { FileText } from 'lucide-react'
import { SelectCell } from '@/components/ui/forms/SelectCell'
import type { SpaceItem } from '@/lib/spaces'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { BaseCellProps } from './cell-types'
import { TextCell } from './TextCell'

function hostEmail(item?: SpaceItem): string | null {
  const raw = item?.custom_data?.host_email
  return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : null
}

export function formatMeetingHostLabel(input: {
  value: unknown
  spaceItem?: SpaceItem
  roster?: TeamRosterEntry[]
  currentUserId?: string | null
}): string {
  const name = typeof input.value === 'string' ? input.value.trim() : ''
  const email = hostEmail(input.spaceItem)
  const me = input.roster?.find(
    (entry) => entry.kind === 'human' && entry.user_id === input.currentUserId,
  )
  const myEmail = me?.email?.trim().toLowerCase() ?? ''
  const isMine = Boolean(email && myEmail && email === myEmail)
  if (!name && !email) return ''
  const label = name || email || ''
  return isMine ? `${label} (Mine)` : label
}

export function hostSelectOptions(input: {
  roster?: TeamRosterEntry[]
  currentLabel: string
}): Array<{ id: string; label: string }> {
  const seen = new Set<string>()
  const options: Array<{ id: string; label: string }> = []
  for (const entry of input.roster ?? []) {
    if (entry.kind !== 'human') continue
    const label = entry.display_name.trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    options.push({ id: label, label })
  }
  const current = input.currentLabel.replace(/\s*\(Mine\)\s*$/, '').trim()
  if (current && !seen.has(current.toLowerCase())) {
    options.push({ id: current, label: current })
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export function HostCell({
  field,
  value,
  onChange,
  readonly,
  spaceItem,
  roster,
  currentUserId,
  fieldRowVariant = 'default',
}: BaseCellProps & {
  spaceItem?: SpaceItem
  roster?: TeamRosterEntry[]
  currentUserId?: string | null
  fieldRowVariant?: 'default' | 'kanban'
}) {
  const label = formatMeetingHostLabel({ value, spaceItem, roster, currentUserId })
  const options = hostSelectOptions({ roster, currentLabel: label })
  if (options.length === 0) {
    return (
      <TextCell
        field={field}
        value={label || value}
        onChange={onChange}
        readonly={readonly}
        fieldRowVariant={fieldRowVariant}
      />
    )
  }
  const selectedId =
    typeof value === 'string' && value.trim()
      ? value.trim()
      : (options.find((option) => option.label === label.replace(/\s*\(Mine\)\s*$/, '').trim())
          ?.id ?? '')
  return (
    <SelectCell
      field={{ ...field, type: 'select', options }}
      value={selectedId}
      onChange={onChange}
      readonly={readonly}
      fieldRowVariant={fieldRowVariant}
      customTrigger={
        <span className="flex min-w-0 items-center gap-1.5">
          <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
          {label ? <span className="text-foreground min-w-0 truncate text-xs">{label}</span> : null}
        </span>
      }
      triggerInline
    />
  )
}
