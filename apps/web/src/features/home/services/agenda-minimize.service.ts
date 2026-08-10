import { agendaEventMinimizeKey } from '@/features/home/lib/agenda-minimize'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

let agendaPersistenceQueue: Promise<void> = Promise.resolve()

export function persistAgendaEventMinimized(
  event: CalendarAgendaEvent,
  minimized: boolean,
): Promise<void> {
  const request = agendaPersistenceQueue.then(async () => {
    await backendPost('/api/integrations/fathom/settings/agenda-exclusion', {
      minimized,
      event: {
        key: agendaEventMinimizeKey(event),
        eventId: event.id,
        title: event.title,
        start: event.start,
        source: event.source,
        accountId: event.account_id ?? null,
      },
    })
  })
  agendaPersistenceQueue = request.catch(() => undefined)
  return request
}

export async function fetchPersistedAgendaMinimizedKeys(): Promise<Set<string>> {
  const response = await backendGet<{
    success: boolean
    exclusions: Array<{ key: string }>
  }>('/api/integrations/fathom/settings/agenda-exclusion')
  return new Set(response.exclusions.map((row) => row.key))
}
