'use client'

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
