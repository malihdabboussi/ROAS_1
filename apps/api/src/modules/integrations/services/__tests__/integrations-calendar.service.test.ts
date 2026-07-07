import { describe, expect, it, vi } from 'vitest'
import { IntegrationsCalendarService } from '../integrations-calendar.service'

function makeService() {
  let integrationId = ''
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      if (column === 'integration_id') integrationId = value
      return query
    }),
  }
  const repository = {
    table: vi.fn(() => query),
  }
  const composio = {
    executeTool: vi.fn(async () => ({ successful: true, data: {} })),
  }
  const orgScope = {
    applyScope: vi.fn(async () => ({
      data: [
        {
          id: `${integrationId}-row`,
          user_id: 'user-1',
          status: 'connected',
          scope_mode: 'personal',
          metadata: { composio_connected_account_id: `${integrationId}-conn` },
        },
      ],
    })),
  }
  return {
    service: new IntegrationsCalendarService(repository as any, composio as any, orgScope as any),
    composio,
  }
}

describe('IntegrationsCalendarService calendar mutations', () => {
  it('maps Google event creates to the create event tool payload', async () => {
    const { service, composio } = makeService()

    await service.createEvent(
      {} as any,
      { id: 'user-1' },
      { orgId: null } as any,
      {
        provider: 'google_calendar',
        title: 'Review launch tasks',
        start: '2026-06-18T10:00:00.000Z',
        end: '2026-06-18T10:30:00.000Z',
        timezone: 'Asia/Nicosia',
        location: 'Office',
      },
    )

    expect(composio.executeTool).toHaveBeenCalledWith(
      'GOOGLECALENDAR_CREATE_EVENT',
      'user-1',
      expect.objectContaining({
        calendar_id: 'primary',
        summary: 'Review launch tasks',
        start_datetime: '2026-06-18T10:00:00.000Z',
        end_datetime: '2026-06-18T10:30:00.000Z',
        timezone: 'Asia/Nicosia',
        location: 'Office',
      }),
      'google_calendar-conn',
    )
  })

  it('maps Outlook updates and Google deletes to provider tools', async () => {
    const { service, composio } = makeService()

    await service.updateEvent(
      {} as any,
      { id: 'user-1' },
      { orgId: null } as any,
      'outlook',
      'outlook:event-123',
      { end: '2026-06-18T11:00:00.000Z', timezone: 'Asia/Nicosia' },
    )
    await service.deleteEvent(
      {} as any,
      { id: 'user-1' },
      { orgId: null } as any,
      'google_calendar',
      'google:event-123',
      {},
    )

    expect(composio.executeTool).toHaveBeenNthCalledWith(
      1,
      'OUTLOOK_UPDATE_CALENDAR_EVENT',
      'user-1',
      expect.objectContaining({
        user_id: 'me',
        event_id: 'event-123',
        end_datetime: '2026-06-18T11:00:00.000Z',
        time_zone: 'Asia/Nicosia',
      }),
      'outlook-conn',
    )
    expect(composio.executeTool).toHaveBeenNthCalledWith(
      2,
      'GOOGLECALENDAR_DELETE_EVENT',
      'user-1',
      { calendar_id: 'primary', event_id: 'event-123' },
      'google_calendar-conn',
    )
  })
})
