import { describe, expect, it, vi } from 'vitest'
import { IntegrationsCalendarService } from '../integrations-calendar.service'

function makeService(options?: {
  orgRows?: Array<Record<string, unknown>>
  personalRow?: Record<string, unknown> | null
}) {
  let integrationId = ''
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      if (column === 'integration_id') integrationId = value
      return query
    }),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: options?.personalRow === undefined ? null : options.personalRow,
      error: null,
    })),
  }
  const repository = {
    table: vi.fn(() => query),
  }
  const composio = {
    executeTool: vi.fn(async () => ({ successful: true, data: {} })),
  }
  const orgScope = {
    applyScope: vi.fn(async () => ({
      data: options?.orgRows ?? [
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

describe('IntegrationsCalendarService team+Mine merge', () => {
  it('merges personal Composio events into Team as Mine', async () => {
    const teamAgenda = {
      getTeamAgenda: vi.fn().mockResolvedValue({
        success: true,
        events: [
          {
            id: 'workspace:ident-1:evt-1',
            title: 'Team standup',
            start: '2026-07-21T15:00:00.000Z',
            end: '2026-07-21T15:30:00.000Z',
            all_day: false,
            location: null,
            video_url: null,
            video_label: null,
            html_link: null,
            color_id: null,
            attendees: [],
            source: 'google_calendar',
            account_id: 'ident-1',
            account_label: 'Alex',
            prep: null,
            related: null,
          },
        ],
        connected: { google_calendar: true, outlook: false },
        accounts: [
          {
            userIntegrationId: 'ident-1',
            composioAccountId: 'alex@company.com',
            label: 'Alex',
            isDefault: false,
            provider: 'google_calendar',
          },
        ],
        team_available: true,
      }),
      isTeamAvailable: vi.fn().mockResolvedValue(true),
    }
    const service = new IntegrationsCalendarService(
      { table: vi.fn() } as never,
      { executeTool: vi.fn() } as never,
      { applyScope: vi.fn() } as never,
      teamAgenda as never,
    )
    const realGetAgenda = service.getAgenda.bind(service)
    vi.spyOn(service, 'getAgenda').mockImplementation(async (supabase, user, scope, query) => {
      if (query?.scope === 'personal') {
        return {
          success: true,
          events: [
            {
              id: 'personal-evt',
              title: 'Dylan Zoom',
              start: '2026-07-21T18:00:00.000Z',
              end: '2026-07-21T18:30:00.000Z',
              all_day: false,
              location: null,
              video_url: null,
              video_label: null,
              html_link: null,
              color_id: null,
              attendees: [],
              source: 'google_calendar',
              account_id: 'pers-1',
              account_label: 'dylan@dylanvanas.com',
              prep: null,
              related: null,
            },
          ],
          connected: { google_calendar: true, outlook: false },
          accounts: [
            {
              userIntegrationId: 'pers-1',
              composioAccountId: 'conn-1',
              label: 'dylan@dylanvanas.com',
              isDefault: true,
              provider: 'google_calendar',
            },
          ],
          team_available: true,
        }
      }
      return realGetAgenda(supabase, user, scope, query)
    })

    const result = await service.getAgenda(
      {} as never,
      { id: 'user-1' },
      { orgId: 'org-1', orgRole: 'admin' } as never,
      {
        start: '2026-07-21T00:00:00.000Z',
        end: '2026-07-22T00:00:00.000Z',
        timezone: 'UTC',
        scope: 'team',
      },
    )

    expect(result.team_available).toBe(true)
    expect(result.events.map((e) => e.id).sort()).toEqual([
      'personal-evt',
      'workspace:ident-1:evt-1',
    ])
    expect(result.events.find((e) => e.id === 'personal-evt')?.account_label).toBe('Mine')
    expect(result.accounts.some((a) => a.label === 'Mine')).toBe(true)
    expect(result.accounts.some((a) => a.label === 'Alex')).toBe(true)
    expect(result.connected.google_calendar).toBe(true)
  })

  it('prefers teammate label when Mine and teammate share the same invite', async () => {
    const teamAgenda = {
      getTeamAgenda: vi.fn().mockResolvedValue({
        success: true,
        events: [
          {
            id: 'workspace:aaron:standup',
            title: 'ROAS x Christian Osgood Weekly Standup',
            start: '2026-07-21T16:15:00.000Z',
            end: '2026-07-21T16:45:00.000Z',
            all_day: false,
            location: null,
            video_url: null,
            video_label: null,
            html_link: null,
            color_id: null,
            attendees: [],
            source: 'google_calendar',
            account_id: 'aaron',
            account_label: 'Aaron McKeague',
            prep: null,
            related: null,
            ical_uid: 'shared-standup',
          },
        ],
        connected: { google_calendar: true, outlook: false },
        accounts: [
          {
            userIntegrationId: 'aaron',
            composioAccountId: 'aaron@roas.co',
            label: 'Aaron McKeague',
            isDefault: false,
            provider: 'google_calendar',
          },
        ],
        team_available: true,
      }),
      isTeamAvailable: vi.fn().mockResolvedValue(true),
    }
    const service = new IntegrationsCalendarService(
      { table: vi.fn() } as never,
      { executeTool: vi.fn() } as never,
      { applyScope: vi.fn() } as never,
      teamAgenda as never,
    )
    const realGetAgenda = service.getAgenda.bind(service)
    vi.spyOn(service, 'getAgenda').mockImplementation(async (supabase, user, scope, query) => {
      if (query?.scope === 'personal') {
        return {
          success: true,
          events: [
            {
              id: 'personal-standup',
              title: 'ROAS x Christian Osgood Weekly Standup',
              start: '2026-07-21T16:15:00.000Z',
              end: '2026-07-21T16:45:00.000Z',
              all_day: false,
              location: null,
              video_url: null,
              video_label: null,
              html_link: null,
              color_id: null,
              attendees: [],
              source: 'google_calendar',
              account_id: 'pers-1',
              account_label: 'dylan@dylanvanas.com',
              prep: null,
              related: null,
              ical_uid: 'shared-standup',
            },
          ],
          connected: { google_calendar: true, outlook: false },
          accounts: [
            {
              userIntegrationId: 'pers-1',
              composioAccountId: 'conn-1',
              label: 'dylan@dylanvanas.com',
              isDefault: true,
              provider: 'google_calendar',
            },
          ],
          team_available: true,
        }
      }
      return realGetAgenda(supabase, user, scope, query)
    })

    const result = await service.getAgenda(
      {} as never,
      { id: 'user-1' },
      { orgId: 'org-1', orgRole: 'admin' } as never,
      {
        start: '2026-07-21T00:00:00.000Z',
        end: '2026-07-22T00:00:00.000Z',
        timezone: 'UTC',
        scope: 'team',
      },
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.account_label).toBe('Aaron McKeague')
  })
})

describe('IntegrationsCalendarService calendar mutations', () => {
  it('maps Google event creates to the create event tool payload', async () => {
    const { service, composio } = makeService({
      orgRows: [
        {
          id: 'calendar-account-2',
          user_id: 'user-1',
          status: 'connected',
          scope_mode: 'personal',
          is_default: false,
          connection_label: 'dylan@dylanvanas.com',
          metadata: { composio_connected_account_id: 'google-calendar-2' },
        },
      ],
    })

    const result = await service.createEvent({} as any, { id: 'user-1' }, { orgId: null } as any, {
      provider: 'google_calendar',
      user_integration_id: 'calendar-account-2',
      title: 'Review launch tasks',
      start: '2026-06-18T10:00:00.000Z',
      end: '2026-06-18T10:30:00.000Z',
      timezone: 'Asia/Nicosia',
      location: 'Office',
    })

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
      'google-calendar-2',
    )
    expect(result.account).toEqual({
      user_integration_id: 'calendar-account-2',
      label: 'dylan@dylanvanas.com',
      provider: 'google_calendar',
      is_default: true,
    })
  })

  it('does not fall back to another calendar when the requested account is unavailable', async () => {
    const { service, composio } = makeService({
      orgRows: [
        {
          id: 'calendar-account-1',
          user_id: 'user-1',
          status: 'connected',
          scope_mode: 'personal',
          is_default: true,
          connection_label: 'dylan@dylanvanas.com',
          metadata: { composio_connected_account_id: 'google-calendar-1' },
        },
      ],
    })

    await expect(
      service.createEvent({} as any, { id: 'user-1' }, { orgId: null } as any, {
        provider: 'google_calendar',
        user_integration_id: 'missing-calendar-account',
        title: 'Review launch tasks',
        start: '2026-06-18T10:00:00.000Z',
        end: '2026-06-18T10:30:00.000Z',
      }),
    ).rejects.toThrow('Selected google_calendar account is not connected')
    expect(composio.executeTool).not.toHaveBeenCalled()
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

  it('uses the caller personal-account Google Calendar when org has no calendar row', async () => {
    const { service, composio } = makeService({
      orgRows: [],
      personalRow: {
        id: 'personal-cal',
        user_id: 'user-1',
        status: 'connected',
        scope_mode: 'personal',
        metadata: { composio_connected_account_id: 'personal-ca' },
      },
    })

    await service.createEvent(
      {} as any,
      { id: 'user-1' },
      { orgId: 'org-1', userId: 'user-1' } as any,
      {
        provider: 'google_calendar',
        title: 'Org agenda event',
        start: '2026-06-18T10:00:00.000Z',
        end: '2026-06-18T10:30:00.000Z',
        timezone: 'UTC',
      },
    )

    expect(composio.executeTool).toHaveBeenCalledWith(
      'GOOGLECALENDAR_CREATE_EVENT',
      'user-1',
      expect.objectContaining({ summary: 'Org agenda event' }),
      'personal-ca',
    )
  })
})
