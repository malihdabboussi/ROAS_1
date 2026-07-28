import { describe, expect, it, vi } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { openAgendaEventDetail } from './agenda-open-routing'

describe('openAgendaEventDetail', () => {
  it('routes linked Fathom calls through the curated meeting detail when available', () => {
    const event = {
      id: 'fathom-1',
      source: 'fathom',
      title: 'Strategy call',
      related: {
        space_id: 'space-1',
        call_item_id: 'meeting-1',
        title: 'Strategy call',
      },
    } as CalendarAgendaEvent
    const onOpenMeeting = vi.fn()
    const onOpenItem = vi.fn()

    openAgendaEventDetail(event, onOpenMeeting, onOpenItem)

    expect(onOpenMeeting).toHaveBeenCalledWith(event)
    expect(onOpenItem).not.toHaveBeenCalled()
  })
})
