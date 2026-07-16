import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { SpaceItem } from '../types'
import type { FieldDef } from '../types/space-schema'
import { normalizeClientLabel } from './page-grader-client-tag'

export type PageGraderAssigneeOption = {
  id: string
  name: string
  email: string | null
}

export type PageGraderSendPreviewRow = {
  spaceItemId: string
  title: string
  description: string
  dueDate: string | null
  priority: string | null
}

function normalizeName(value: string): string {
  return normalizeClientLabel(value)
}

export function resolvePageGraderAssigneeSuggestion(input: {
  selectedItems: SpaceItem[]
  roster: TeamRosterEntry[]
  assignees: PageGraderAssigneeOption[]
  attendeesField?: FieldDef
}): string | null {
  if (input.assignees.length === 0) return null

  const byEmail = new Map(
    input.assignees
      .filter((a) => a.email)
      .map((a) => [a.email!.trim().toLowerCase(), a.id] as const),
  )
  const byName = new Map(
    input.assignees.map((a) => [normalizeName(a.name), a.id] as const),
  )

  for (const item of input.selectedItems) {
    for (const assignee of item.assignees ?? []) {
      if (assignee.type !== 'human') continue
      const person = input.roster.find(
        (r) => r.kind === 'human' && (r.user_id === assignee.id || r.participant_id === assignee.id),
      )
      if (!person) continue
      const email = person.email?.trim().toLowerCase()
      if (email && byEmail.has(email)) return byEmail.get(email) ?? null
      const nameId = byName.get(normalizeName(person.display_name))
      if (nameId) return nameId
    }
  }

  const attendeeOptions = input.attendeesField?.options ?? []
  for (const item of input.selectedItems) {
    const raw = item.custom_data?.attendees
    const ids = Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === 'string')
      : []
    for (const optionId of ids) {
      const option = attendeeOptions.find((o) => o.id === optionId)
      const label = option?.label?.trim()
      if (!label) continue
      const nameId = byName.get(normalizeName(label))
      if (nameId) return nameId
    }
  }

  return null
}

export function resolveSharedPageGraderDueDate(selectedItems: SpaceItem[]): string {
  const dates = selectedItems
    .map((item) => (typeof item.due_date === 'string' ? item.due_date.trim().slice(0, 10) : ''))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  if (dates.length === 0) return ''
  const first = dates[0]!
  return dates.every((d) => d === first) ? first : ''
}

export function buildPageGraderSendPreviews(
  selectedItems: SpaceItem[],
  note?: string,
  dueDateOverride?: string | null,
): PageGraderSendPreviewRow[] {
  const override =
    typeof dueDateOverride === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDateOverride.trim())
      ? dueDateOverride.trim().slice(0, 10)
      : null
  return selectedItems.map((item) => {
    const parts: string[] = []
    const description = typeof item.description === 'string' ? item.description.trim() : ''
    const notes = typeof item.notes === 'string' ? item.notes.trim() : ''
    if (description) parts.push(description)
    if (notes && notes !== description) parts.push(notes)
    if (note?.trim()) parts.push(`Operator note: ${note.trim()}`)
    const itemDue =
      typeof item.due_date === 'string' && item.due_date.trim()
        ? item.due_date.trim().slice(0, 10)
        : null
    return {
      spaceItemId: item.id,
      title: item.title?.trim() || 'Untitled task',
      description: parts.join('\n\n'),
      dueDate: override ?? itemDue,
      priority: item.priority ?? null,
    }
  })
}
