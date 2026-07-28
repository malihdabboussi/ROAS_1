import { describe, expect, it, vi } from 'vitest'
import { IntegrationsCalendarTeamService } from '../integrations-calendar-team.service'

describe('IntegrationsCalendarTeamService', () => {
  it('marks team available for Workspace connection row even without vault probe', async () => {
    const workspaceApi = {
      getStatus: vi.fn().mockResolvedValue({ connected: true, status: 'connected' }),
    }
    const service = new IntegrationsCalendarTeamService(
      {} as never,
      workspaceApi as never,
      undefined,
    )
    await expect(
      service.isTeamAvailable({
        orgId: 'org-1',
        orgRole: 'admin',
      } as never),
    ).resolves.toBe(true)
  })

  it('marks team available only for connected Workspace admins', async () => {
    const workspaceApi = {
      getStatus: vi.fn().mockResolvedValue({ connected: true }),
    }
    const service = new IntegrationsCalendarTeamService(
      {} as never,
      workspaceApi as never,
      undefined,
    )
    await expect(
      service.isTeamAvailable({
        orgId: 'org-1',
        orgRole: 'admin',
      } as never),
    ).resolves.toBe(true)
    await expect(
      service.isTeamAvailable({
        orgId: 'org-1',
        orgRole: 'viewer',
      } as never),
    ).resolves.toBe(false)
  })

  it('flattens Workspace people calendars and enriches like personal agenda', async () => {
    const workspaceCalendar = {
      listOrgUpcoming: vi.fn().mockResolvedValue({
        success: true,
        people: [
          {
            identity: {
              id: 'ident-1',
              display_name: 'Alex',
              calendar_email: 'alex@company.com',
              match_status: 'confirmed',
            },
            events: [
              {
                id: 'evt-1',
                title: 'Kickoff',
                start: '2026-07-21T10:00:00.000Z',
                end: '2026-07-21T10:30:00.000Z',
                all_day: false,
                location: null,
                video_url: 'https://meet.google.com/abc',
                html_link: null,
                attendees: [{ name: 'Alex', email: 'alex@company.com' }],
              },
            ],
          },
        ],
        coverage: {
          limit_people: 40,
          directory_count: 2,
          pulled_count: 1,
          skipped: [
            {
              identity: {
                id: 'ident-2',
                calendar_email: 'rejected@company.com',
                display_name: 'Rejected',
                match_status: 'rejected',
              },
              reason: 'rejected',
            },
          ],
        },
      }),
    }
    const workspaceApi = {
      getStatus: vi.fn().mockResolvedValue({ connected: true }),
    }
    const precallPrep = {
      enrichAgendaEvents: vi
        .fn()
        .mockResolvedValue(
          new Map([
            [
              'workspace:ident-1:evt-1',
              { status: 'ready', space_item_id: 'prep-1', space_id: 'sp-1', title: 'Prep' },
            ],
          ]),
        ),
      enrichAgendaRelatedCalls: vi.fn().mockResolvedValue({
        relatedByEventId: new Map([
          [
            'workspace:ident-1:evt-1',
            {
              space_id: 'sp-1',
              call_item_id: 'call-1',
              title: 'Kickoff',
              summary: null,
              has_transcript: false,
              recording_url: null,
              follow_ups: [],
            },
          ],
        ]),
        unmatchedFathomEvents: [],
      }),
    }
    const service = new IntegrationsCalendarTeamService(
      workspaceCalendar as never,
      workspaceApi as never,
      precallPrep as never,
    )

    const result = await service.getTeamAgenda(
      {} as never,
      { id: 'user-1' },
      { orgId: 'org-1', orgRole: 'owner' } as never,
      {
        start: '2026-07-21T00:00:00.000Z',
        end: '2026-07-22T00:00:00.000Z',
        timezone: 'UTC',
      },
    )

    expect(result.success).toBe(true)
    expect(result.team_available).toBe(true)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.id).toBe('workspace:ident-1:evt-1')
    expect(result.events[0]?.account_label).toBe('Alex')
    expect(result.events[0]?.prep?.space_item_id).toBe('prep-1')
    expect(result.events[0]?.related?.call_item_id).toBe('call-1')
    expect(result.team_coverage?.totals).toEqual({
      directory: 2,
      pulled: 1,
      rejected: 1,
      capped: 0,
      failed: 0,
    })
    expect(result.team_coverage?.included[0]).toMatchObject({
      email: 'alex@company.com',
      event_count: 1,
    })
    expect(result.team_coverage?.skipped[0]?.reason).toBe('rejected')
    expect(precallPrep.enrichAgendaRelatedCalls).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1' }),
    )
    expect(precallPrep.enrichAgendaEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [expect.objectContaining({ id: 'workspace:ident-1:evt-1' })],
      }),
    )
  })

  it('includes Directory people that are unmatched and surfaces DWD errors in coverage', async () => {
    const workspaceCalendar = {
      listOrgUpcoming: vi.fn().mockResolvedValue({
        success: true,
        people: [
          {
            identity: {
              id: 'nate',
              display_name: 'Nate',
              calendar_email: 'nate@roas.co',
              match_status: 'unmatched',
            },
            events: [
              {
                id: 'evt-n',
                title: '1:1',
                start: '2026-07-21T15:00:00.000Z',
                end: '2026-07-21T15:30:00.000Z',
                all_day: false,
                location: null,
                video_url: null,
                html_link: null,
                attendees: [],
              },
            ],
          },
          {
            identity: {
              id: 'bryce',
              display_name: 'Bryce',
              calendar_email: 'bryce@roas.co',
              match_status: 'confirmed',
            },
            events: [],
            error: 'Delegation denied for bryce@roas.co',
          },
        ],
        coverage: {
          limit_people: 40,
          directory_count: 2,
          pulled_count: 2,
          skipped: [],
        },
      }),
    }
    const workspaceApi = {
      getStatus: vi.fn().mockResolvedValue({ connected: true }),
    }
    const service = new IntegrationsCalendarTeamService(
      workspaceCalendar as never,
      workspaceApi as never,
      undefined,
    )

    const result = await service.getTeamAgenda(
      {} as never,
      { id: 'user-1' },
      { orgId: 'org-1', orgRole: 'admin' } as never,
      {
        start: '2026-07-21T00:00:00.000Z',
        end: '2026-07-22T00:00:00.000Z',
      },
    )

    expect(result.success).toBe(true)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.account_label).toBe('Nate')
    expect(result.team_coverage?.included.map((p) => p.email).sort()).toEqual([
      'bryce@roas.co',
      'nate@roas.co',
    ])
    expect(result.team_coverage?.errors).toEqual([
      expect.objectContaining({
        email: 'bryce@roas.co',
        error: 'Delegation denied for bryce@roas.co',
      }),
    ])
    expect(result.team_coverage?.totals.failed).toBe(1)
  })
})
