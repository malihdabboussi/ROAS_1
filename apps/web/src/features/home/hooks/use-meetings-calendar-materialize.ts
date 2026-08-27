import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { materializeScheduledMeetings } from '@/features/home/services/meeting-workspace-api'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchCalendarAgenda } from '@/lib/services/calendar-api'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

const MATERIALIZE_TTL_MS = 90_000
const MAX_EVENTS = 80

function meetingNaturalKey(event: CalendarAgendaEvent): string {
  const icalUid = event.ical_uid?.trim().toLowerCase()
  if (icalUid) return `ical:${icalUid}`
  return [
    event.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim(),
    new Date(event.start).toISOString(),
  ].join(':')
}

export function isMaterializableMeetingEvent(event: CalendarAgendaEvent): boolean {
  if (event.source === 'fathom' || event.source === 'manual' || event.all_day) return false
  return event.attendees.length > 0 || Boolean(event.video_url?.trim())
}

export function uniqueMaterializableMeetingEvents(
  events: CalendarAgendaEvent[],
): CalendarAgendaEvent[] {
  const unique = new Map<string, CalendarAgendaEvent>()
  for (const event of events) {
    if (!isMaterializableMeetingEvent(event)) continue
    const key = meetingNaturalKey(event)
    if (!unique.has(key)) unique.set(key, event)
  }
  return [...unique.values()].slice(0, MAX_EVENTS)
}

export function useMeetingsCalendarMaterialize(
  spaceId: string | null,
  onMaterialized?: (spaceId: string) => Promise<void>,
) {
  const startedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!spaceId) return
    if (startedFor.current === spaceId) return
    startedFor.current = spaceId
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setDate(end.getDate() + 14)
    end.setHours(23, 59, 59, 999)
    let cancelled = false
    void cachedFetch(
      `meetings-materialize-agenda:${spaceId}:${start.toISOString()}:${end.toISOString()}`,
      () =>
        fetchCalendarAgenda({
          start: start.toISOString(),
          end: end.toISOString(),
          timezone,
        }),
      { ttlMs: MATERIALIZE_TTL_MS },
    )
      .then(async (agenda) => {
        if (cancelled) return
        // Fathom/manual rows already exist as items; all-day entries (birthdays, OOO,
        // holidays) are not calls and should not become All Meetings rows.
        const events = uniqueMaterializableMeetingEvents(agenda.events ?? [])
        if (events.length === 0) return
        await materializeScheduledMeetings(spaceId, events)
        if (!cancelled) {
          invalidateCachedFetch(`space-items:${spaceId}:`)
          await onMaterialized?.(spaceId)
        }
      })
      .catch(() => {
        if (!cancelled) toast.error(HOME_TOAST_ERRORS.MEETINGS_MATERIALIZE_FAILED.userMessage)
      })
    return () => {
      cancelled = true
    }
  }, [onMaterialized, spaceId])
}
