import { describe, expect, it, vi } from 'vitest'
import { GoogleWorkspaceCalendarService } from '../google-workspace-calendar.service'

describe('GoogleWorkspaceCalendarService.listOrgUpcoming', () => {
  it('pulls Directory calendars unless rejected and reports skipped coverage', async () => {
    const identitiesRepo = {
      serviceList: vi.fn().mockResolvedValue([
        {
          id: 'nate',
          calendar_email: 'nate@roas.co',
          display_name: 'Nate',
          match_status: 'unmatched',
          source: 'directory_sync',
          google_workspace_user_id: 'g-nate',
        },
        {
          id: 'bryce',
          calendar_email: 'bryce@roas.co',
          display_name: 'Bryce',
          match_status: 'confirmed',
          source: 'directory_sync',
          google_workspace_user_id: 'g-bryce',
        },
        {
          id: 'reject',
          calendar_email: 'old@roas.co',
          display_name: 'Old',
          match_status: 'rejected',
          source: 'directory_sync',
          google_workspace_user_id: 'g-old',
        },
        {
          id: 'slack-only',
          calendar_email: 'external@gmail.com',
          display_name: 'External',
          match_status: 'confirmed',
          source: 'slack_email',
          google_workspace_user_id: null,
        },
      ]),
    }
    const client = {
      listCalendarEvents: vi
        .fn()
        .mockImplementation(async ({ calendarEmail }: { calendarEmail: string }) => [
          {
            id: `evt-${calendarEmail}`,
            title: 'Standup',
            start: '2026-07-28T16:00:00.000Z',
            end: '2026-07-28T16:15:00.000Z',
            all_day: false,
            location: null,
            video_url: null,
            html_link: null,
            ical_uid: null,
            attendees: [],
            source: 'google_workspace',
            calendar_email: calendarEmail,
          },
        ]),
    }
    const api = {
      loadServiceAccount: vi
        .fn()
        .mockResolvedValue({ serviceAccount: { private_key: 'k', client_email: 'sa' } }),
    }
    const service = new GoogleWorkspaceCalendarService(
      api as never,
      client as never,
      {} as never,
      identitiesRepo as never,
    )

    const result = await service.listOrgUpcoming({} as never, { orgId: 'org-1' } as never, {
      start: '2026-07-28T00:00:00.000Z',
      end: '2026-07-29T00:00:00.000Z',
    })

    expect(client.listCalendarEvents).toHaveBeenCalledTimes(2)
    expect(result.people.map((p) => p.identity.calendar_email).sort()).toEqual([
      'bryce@roas.co',
      'nate@roas.co',
    ])
    expect(result.coverage.pulled_count).toBe(2)
    expect(result.coverage.directory_count).toBe(3)
    expect(result.coverage.skipped).toEqual([
      expect.objectContaining({
        reason: 'rejected',
        identity: expect.objectContaining({ calendar_email: 'old@roas.co' }),
      }),
    ])
  })

  it('still DWD-pulls the signed-in user when Directory is over the people cap', async () => {
    const identitiesRepo = {
      serviceList: vi.fn().mockResolvedValue([
        {
          id: 'aaron',
          calendar_email: 'aaron@roas.co',
          display_name: 'Aaron',
          match_status: 'confirmed',
          source: 'directory_sync',
          google_workspace_user_id: 'g-aaron',
          vibey_user_id: 'user-aaron',
        },
        {
          id: 'dylan',
          calendar_email: 'dylan@roas.co',
          display_name: 'Dylan',
          match_status: 'confirmed',
          source: 'directory_sync',
          google_workspace_user_id: 'g-dylan',
          vibey_user_id: 'user-dylan',
        },
      ]),
    }
    const client = {
      listCalendarEvents: vi.fn().mockResolvedValue([]),
    }
    const api = {
      loadServiceAccount: vi
        .fn()
        .mockResolvedValue({ serviceAccount: { private_key: 'k', client_email: 'sa' } }),
    }
    const service = new GoogleWorkspaceCalendarService(
      api as never,
      client as never,
      {} as never,
      identitiesRepo as never,
    )

    const result = await service.listOrgUpcoming({} as never, { orgId: 'org-1' } as never, {
      start: '2026-08-18T00:00:00.000Z',
      end: '2026-08-19T00:00:00.000Z',
      limit_people: 1,
      prefer_vibey_user_id: 'user-dylan',
    })

    expect(client.listCalendarEvents).toHaveBeenCalledTimes(1)
    expect(client.listCalendarEvents).toHaveBeenCalledWith(
      expect.objectContaining({ calendarEmail: 'dylan@roas.co' }),
    )
    expect(result.people[0]?.identity.calendar_email).toBe('dylan@roas.co')
    expect(result.coverage.skipped).toEqual([
      expect.objectContaining({
        reason: 'capped',
        identity: expect.objectContaining({ calendar_email: 'aaron@roas.co' }),
      }),
    ])
  })

  it('loads Mine from the linked Directory mailbox instead of login Gmail', async () => {
    const identitiesRepo = {
      serviceList: vi.fn().mockResolvedValue([
        {
          id: 'nate',
          calendar_email: 'nate@roas.co',
          display_name: 'Nate',
          match_status: 'confirmed',
          source: 'directory_sync',
          google_workspace_user_id: 'g-nate',
          vibey_user_id: 'user-nate',
        },
        {
          id: 'dylan',
          calendar_email: 'dylan@roas.co',
          display_name: 'Dylan Vanas',
          match_status: 'confirmed',
          source: 'directory_sync',
          google_workspace_user_id: 'g-dylan',
          vibey_user_id: 'user-dylan',
        },
      ]),
    }
    const client = {
      listCalendarEvents: vi.fn().mockResolvedValue([
        {
          id: 'standup',
          title: 'ROAS x Christian Osgood Weekly Standup',
          start: '2026-08-18T16:15:00.000Z',
          end: '2026-08-18T16:30:00.000Z',
          all_day: false,
          location: null,
          video_url: null,
          html_link: null,
          ical_uid: null,
          attendees: [],
          source: 'google_workspace',
          calendar_email: 'dylan@roas.co',
        },
      ]),
    }
    const api = {
      loadServiceAccount: vi
        .fn()
        .mockResolvedValue({ serviceAccount: { private_key: 'k', client_email: 'sa' } }),
    }
    const service = new GoogleWorkspaceCalendarService(
      api as never,
      client as never,
      {} as never,
      identitiesRepo as never,
    )

    const result = await service.getCallerAgenda({} as never, { orgId: 'org-1' } as never, {
      start: '2026-08-18T07:00:00.000Z',
      end: '2026-08-19T07:00:00.000Z',
      email: 'dylan@dylanvanas.com',
      vibey_user_id: 'user-dylan',
    })

    expect(client.listCalendarEvents).toHaveBeenCalledWith(
      expect.objectContaining({ calendarEmail: 'dylan@roas.co' }),
    )
    expect(result.identity?.calendar_email).toBe('dylan@roas.co')
    expect(result.events[0]?.title).toBe('ROAS x Christian Osgood Weekly Standup')
  })
})
