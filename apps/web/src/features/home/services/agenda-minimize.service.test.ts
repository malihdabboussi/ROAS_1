import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import {
  fetchPersistedAgendaMinimizedKeys,
  persistAgendaEventMinimized,
} from './agenda-minimize.service'

const { backendGet, backendPost } = vi.hoisted(() => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({ backendGet, backendPost }))

const EVENT = {
  id: 'event-1',
  title: 'Weekly review',
  start: '2026-07-30T17:00:00.000Z',
  end: '2026-07-30T18:00:00.000Z',
  source: 'google_calendar',
  account_id: 'account-1',
  attendees: [],
  all_day: false,
  video_url: null,
  video_label: null,
  html_link: null,
  color_id: null,
} satisfies CalendarAgendaEvent

describe('Agenda minimize persistence', () => {
  beforeEach(() => {
    backendGet.mockReset()
    backendPost.mockReset()
  })

  it('persists the exact agenda occurrence used by the Fathom exclusion gate', async () => {
    backendPost.mockResolvedValue({ success: true })

    await persistAgendaEventMinimized(EVENT, true)

    expect(backendPost).toHaveBeenCalledWith('/api/integrations/fathom/settings/agenda-exclusion', {
      minimized: true,
      event: {
        key: 'account-1:event-1:2026-07-30T17:00:00.000Z',
        eventId: 'event-1',
        title: 'Weekly review',
        start: '2026-07-30T17:00:00.000Z',
        source: 'google_calendar',
        accountId: 'account-1',
      },
    })
  })

  it('serializes writes so rapid changes cannot overwrite newer preferences', async () => {
    let releaseFirst: (() => void) | undefined
    backendPost
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirst = resolve
          }),
      )
      .mockResolvedValueOnce({ success: true })

    const minimize = persistAgendaEventMinimized(EVENT, true)
    const restore = persistAgendaEventMinimized(EVENT, false)
    await vi.waitFor(() => expect(backendPost).toHaveBeenCalledTimes(1))

    releaseFirst?.()
    await minimize
    await restore

    expect(backendPost).toHaveBeenCalledTimes(2)
    expect(backendPost.mock.calls[1]?.[1]).toMatchObject({ minimized: false })
  })

  it('loads the persisted occurrence keys used to reconcile the Agenda UI', async () => {
    backendGet.mockResolvedValue({
      success: true,
      exclusions: [{ key: 'occurrence-1' }, { key: 'occurrence-2' }],
    })

    await expect(fetchPersistedAgendaMinimizedKeys()).resolves.toEqual(
      new Set(['occurrence-1', 'occurrence-2']),
    )
  })
})
