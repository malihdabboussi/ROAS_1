import { describe, expect, it, vi } from 'vitest'
import { MeetingsPrecallPrepService } from '../meetings-precall-prep.service'

function supabaseStub() {
  const terminal = {
    then(onFulfilled: (value: { error: null }) => unknown) {
      return Promise.resolve({ error: null }).then(onFulfilled)
    },
  }
  const chain = {
    eq: vi.fn(() => chain),
    ...terminal,
  }
  // Final awaited call after one or more .eq()
  chain.eq.mockImplementation(() => ({
    eq: chain.eq,
    then: terminal.then.bind(terminal),
  }))
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => chain),
    })),
  }
}

describe('MeetingsPrecallPrepService.runForEvent', () => {
  it('uses the provided event snapshot instead of today’s agenda lookup', async () => {
    const spacesRepo = {
      findSpaceByIdForAccess: vi.fn().mockResolvedValue({ id: 'space-1', org_id: null }),
      findItemByCalendarEventId: vi.fn().mockResolvedValue(null),
      createItem: vi.fn().mockResolvedValue({ id: 'prep-1' }),
    }
    const userAgentApi = {
      invoke: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    }
    const configService = {
      get: vi.fn().mockReturnValue('token'),
    }
    const service = new MeetingsPrecallPrepService(
      { get: vi.fn() } as never,
      spacesRepo as never,
      userAgentApi as never,
      configService as never,
    )
    const getAgenda = vi.fn()
    vi.spyOn(service as never, 'resolveCalendarService' as never).mockReturnValue({
      getAgenda,
    } as never)
    vi.spyOn(service as never, 'loadRelatedContext' as never).mockResolvedValue('')

    const result = await service.runForEvent({
      supabase: supabaseStub() as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      calendarEventId: 'workspace:ident:evt-1',
      timezone: 'America/Los_Angeles',
      refresh: true,
      scope: { orgId: null } as never,
      eventSnapshot: {
        title: 'ROAS - Shawn Kaplan',
        start: '2026-07-28T17:00:00.000Z',
        end: '2026-07-28T18:00:00.000Z',
        all_day: false,
        video_url: 'https://us06web.zoom.us/j/1',
        attendees: [
          { email: 'nefi@roas.co', name: 'Nefi' },
          { email: 'shawn.kaplan@ccm.com', name: 'Shawn' },
        ],
      },
    })

    expect(getAgenda).not.toHaveBeenCalled()
    expect(result.calendar_event_id).toBe('workspace:ident:evt-1')
    expect(result.space_item_id).toBe('prep-1')
    expect(spacesRepo.createItem).toHaveBeenCalled()
  })

  it('looks up the event around its start day when no snapshot is provided', async () => {
    const spacesRepo = {
      findSpaceByIdForAccess: vi.fn().mockResolvedValue({ id: 'space-1', org_id: null }),
      findItemByCalendarEventId: vi.fn().mockResolvedValue(null),
      createItem: vi.fn().mockResolvedValue({ id: 'prep-2' }),
    }
    const userAgentApi = {
      invoke: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    }
    const configService = {
      get: vi.fn().mockReturnValue('token'),
    }
    const service = new MeetingsPrecallPrepService(
      { get: vi.fn() } as never,
      spacesRepo as never,
      userAgentApi as never,
      configService as never,
    )
    const event = {
      id: 'gcal:evt-tomorrow',
      title: 'Tomorrow sync',
      start: '2026-07-29T17:00:00.000Z',
      end: '2026-07-29T17:30:00.000Z',
      all_day: false,
      video_url: 'https://meet.google.com/abc',
      attendees: [{ email: 'a@roas.co', name: 'Alex' }],
    }
    const getAgenda = vi.fn().mockResolvedValue({ events: [event] })
    vi.spyOn(service as never, 'resolveCalendarService' as never).mockReturnValue({
      getAgenda,
    } as never)
    vi.spyOn(service as never, 'loadRelatedContext' as never).mockResolvedValue('')

    const result = await service.runForEvent({
      supabase: supabaseStub() as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      calendarEventId: 'gcal:evt-tomorrow',
      timezone: 'America/Los_Angeles',
      refresh: true,
      scope: { orgId: null } as never,
      eventStartHint: '2026-07-29T17:00:00.000Z',
    })

    expect(getAgenda).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'user-1' },
      expect.anything(),
      expect.objectContaining({
        start: expect.any(String),
        end: expect.any(String),
      }),
    )
    expect(result.calendar_event_id).toBe('gcal:evt-tomorrow')
  })
})
