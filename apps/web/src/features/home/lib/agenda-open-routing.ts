import { minimalSpaceYourTurnItem } from '@/features/home/lib/home-your-turn-item'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import type { YourTurnItem } from '@/lib/your-turn/types'

export function openAgendaEventDetail(
  event: CalendarAgendaEvent,
  onOpenMeeting?: (event: CalendarAgendaEvent) => void,
  onOpenItem?: (item: YourTurnItem) => void | Promise<void>,
): void {
  if (onOpenMeeting) {
    onOpenMeeting(event)
    return
  }
  if (event.source !== 'fathom' || !event.related || !onOpenItem) return
  void onOpenItem(
    minimalSpaceYourTurnItem(
      event.related.space_id,
      event.related.call_item_id,
      event.related.title || event.title,
      null,
    ),
  )
}
