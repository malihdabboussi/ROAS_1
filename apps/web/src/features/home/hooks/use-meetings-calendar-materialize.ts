import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { materializeScheduledMeetings } from '@/features/home/services/meeting-workspace-api'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchCalendarAgenda } from '@/lib/services/calendar-api'

const MATERIALIZE_TTL_MS = 90_000
const MAX_EVENTS = 80

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
      MATERIALIZE_TTL_MS,
      () =>
        fetchCalendarAgenda({
          start: start.toISOString(),
          end: end.toISOString(),
          timezone,
        }),
    )
      .then(async (agenda) => {
        if (cancelled) return
        const events = (agenda.events ?? [])
          .filter((event) => event.source !== 'fathom' && event.source !== 'manual')
          .slice(0, MAX_EVENTS)
        if (events.length === 0) return
        await materializeScheduledMeetings(spaceId, events)
        if (!cancelled) await onMaterialized?.(spaceId)
      })
      .catch(() => {
        if (!cancelled) toast.error(HOME_TOAST_ERRORS.MEETINGS_MATERIALIZE_FAILED.userMessage)
      })
    return () => {
      cancelled = true
    }
  }, [onMaterialized, spaceId])
}
