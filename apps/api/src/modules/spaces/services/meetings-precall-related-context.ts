import type { SupabaseClient } from '@supabase/supabase-js'
import type { PrecallAgendaEventLike } from './meetings-precall-agenda-sections'

const normalizeMeetingTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b(prep|meeting|weekly|sync|call|client)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export async function loadPrecallRelatedContext(
  supabase: SupabaseClient,
  spaceId: string,
  event: PrecallAgendaEventLike,
): Promise<string> {
  const emails = event.attendees
    .map((attendee) => attendee.email?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value))
  const { data } = await supabase
    .from('space_items')
    .select('title, notes, custom_data, created_at')
    .eq('space_id', spaceId)
    .eq('custom_data->>entry_type', 'call')
    .order('created_at', { ascending: false })
    .limit(8)
  const rows = (data ?? []) as Array<{
    title?: string
    notes?: string | null
    custom_data?: Record<string, unknown> | null
  }>
  const eventTitleKey = normalizeMeetingTitle(event.title)
  const snippets: string[] = []
  for (const row of rows) {
    const attendees = row.custom_data?.attendees
    const attendeeBlob = Array.isArray(attendees)
      ? attendees.map((attendee) => String(attendee).toLowerCase()).join(' ')
      : ''
    const overlaps =
      emails.length > 0
        ? emails.some(
            (email) =>
              attendeeBlob.includes(email) ||
              String(row.title ?? '')
                .toLowerCase()
                .includes(email.split('@')[0] ?? ''),
          )
        : eventTitleKey.length >= 4 &&
          normalizeMeetingTitle(String(row.title ?? '')).includes(eventTitleKey)
    if (!overlaps) continue
    snippets.push(
      `- ${row.title ?? 'Untitled call'}${row.notes ? `: ${String(row.notes).slice(0, 280)}` : ''}`,
    )
    if (snippets.length >= 3) break
  }
  return snippets.join('\n')
}
