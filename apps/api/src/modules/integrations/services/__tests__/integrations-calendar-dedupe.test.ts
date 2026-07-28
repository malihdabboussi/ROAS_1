import { describe, expect, it } from 'vitest'
import {
  agendaTitleSimilarity,
  dedupeCalendarAgendaEvents,
  dedupeTeamAgendaEvents,
  mergeFathomIntoNearStartCalendars,
  mergeTeamAgendaWithPersonal,
  normalizeAgendaTitle,
  resolveTeamAgendaAccountLabel,
  teamAgendaDedupeKey,
} from '../integrations-calendar-dedupe'
import type { CalendarAgendaEvent } from '../integrations-calendar.service'

function event(
  partial: Partial<CalendarAgendaEvent> & { ical_uid?: string | null },
): CalendarAgendaEvent & { ical_uid?: string | null } {
  return {
    id: partial.id ?? 'id',
    title: partial.title ?? 'Call',
    start: partial.start ?? '2026-07-21T22:00:00.000Z',
    end: partial.end ?? '2026-07-21T22:30:00.000Z',
    all_day: false,
    location: null,
    video_url: partial.video_url ?? null,
    video_label: null,
    html_link: partial.html_link ?? null,
    color_id: null,
    attendees: partial.attendees ?? [],
    source: partial.source ?? 'google_calendar',
    account_id: partial.account_id ?? null,
    account_label: partial.account_label ?? null,
    prep: null,
    related: partial.related ?? null,
    ical_uid: partial.ical_uid,
  }
}

describe('integrations-calendar-dedupe', () => {
  it('prefers iCalUID for the same meeting across people', () => {
    expect(teamAgendaDedupeKey(event({ id: 'a', ical_uid: 'uid-1', account_label: 'Alex' }))).toBe(
      'ical:uid-1',
    )
  })

  it('merges duplicate team calls into one row with combined labels', () => {
    const deduped = dedupeTeamAgendaEvents([
      event({
        id: 'evt-alex',
        ical_uid: 'shared-1',
        account_label: 'Alex',
        attendees: [{ email: 'alex@roas.co', name: 'Alex', status: 'unknown' }],
      }),
      event({
        id: 'evt-nancy',
        ical_uid: 'shared-1',
        account_label: 'Nancy',
        attendees: [
          { email: 'nancy@roas.co', name: 'Nancy', status: 'unknown' },
          { email: 'alex@roas.co', name: 'Alex', status: 'unknown' },
        ],
      }),
    ])
    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.account_label).toBe('Alex · Nancy')
    expect(deduped[0]?.attendees.map((a) => a.email).sort()).toEqual([
      'alex@roas.co',
      'nancy@roas.co',
    ])
  })

  it('keeps Mine first when a teammate calendar also has the call', () => {
    expect(resolveTeamAgendaAccountLabel(['Mine', 'Aaron McKeague'])).toBe('Mine · Aaron McKeague')
    expect(resolveTeamAgendaAccountLabel(['Fathom', 'Mine', 'Nefi Blanco'])).toBe(
      'Mine · Nefi Blanco',
    )
    expect(resolveTeamAgendaAccountLabel(['Mine', 'Fathom'])).toBe('Mine')
    expect(resolveTeamAgendaAccountLabel(['Fathom'])).toBe('Fathom')
  })

  it('merges Mine calendar + unmatched Fathom AI title into one row', () => {
    const deduped = dedupeTeamAgendaEvents([
      event({
        id: 'google:joey',
        title: 'Dylan Vanas and Joey Abdullah | Zoom Call',
        start: '2026-07-21T23:30:00.000Z',
        end: '2026-07-22T00:00:00.000Z',
        account_label: 'Mine',
        video_url: 'https://zoom.us/j/1',
      }),
      event({
        id: 'fathom:mortgage',
        title: 'Mortgage referral partnership exploration with Neil intro',
        start: '2026-07-21T23:33:11.000Z',
        end: '2026-07-22T00:03:11.000Z',
        source: 'fathom',
        account_label: 'Fathom',
        video_url: 'https://fathom.video/share/x',
        related: {
          space_id: 'sp',
          call_item_id: 'mortgage',
          title: 'Mortgage referral partnership exploration with Neil intro',
          summary: null,
          has_transcript: false,
          recording_url: 'https://fathom.video/share/x',
          follow_ups: [],
        },
      }),
    ])
    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.id).toBe('google:joey')
    expect(deduped[0]?.source).toBe('google_calendar')
    expect(deduped[0]?.account_label).toBe('Mine')
    expect(deduped[0]?.related?.call_item_id).toBe('mortgage')
    expect(deduped[0]?.video_url).toBe('https://zoom.us/j/1')
  })

  it('merges teammate calendar + Fathom Mine row and prefers teammate label', () => {
    const deduped = dedupeTeamAgendaEvents([
      event({
        id: 'workspace:aaron:standup',
        title: 'ROAS x Christian Osgood Weekly Standup',
        start: '2026-07-21T16:15:00.000Z',
        end: '2026-07-21T16:45:00.000Z',
        account_label: 'Aaron McKeague',
      }),
      event({
        id: 'fathom:campaign',
        title: 'Review campaign performance and strategize next steps for key clients.',
        start: '2026-07-21T16:14:50.000Z',
        end: '2026-07-21T16:44:50.000Z',
        source: 'fathom',
        account_label: 'Fathom',
        related: {
          space_id: 'sp',
          call_item_id: 'campaign',
          title: 'Review campaign performance',
          summary: null,
          has_transcript: false,
          recording_url: 'https://fathom.video/share/y',
          follow_ups: [],
        },
      }),
    ])
    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.account_label).toBe('Aaron McKeague')
    expect(deduped[0]?.related?.call_item_id).toBe('campaign')
  })

  it('keeps Fathom separate when two calendars share the same near-start window', () => {
    const merged = mergeFathomIntoNearStartCalendars([
      event({
        id: 'cal-a',
        title: 'Call A',
        start: '2026-07-21T18:00:00.000Z',
        end: '2026-07-21T18:30:00.000Z',
      }),
      event({
        id: 'cal-b',
        title: 'Call B',
        start: '2026-07-21T18:05:00.000Z',
        end: '2026-07-21T18:35:00.000Z',
      }),
      event({
        id: 'fathom:x',
        title: 'Ambiguous recording',
        start: '2026-07-21T18:02:00.000Z',
        end: '2026-07-21T18:32:00.000Z',
        source: 'fathom',
        account_label: 'Fathom',
      }),
    ])
    expect(merged.filter((e) => e.source === 'fathom')).toHaveLength(1)
    expect(merged).toHaveLength(3)
  })

  it('collapses personal multi-calendar near-duplicate titles at the same slot', () => {
    const deduped = dedupeCalendarAgendaEvents([
      event({
        id: 'google:a',
        title: '1DS / ROAS Weekly Check in',
        html_link: 'https://calendar.google.com/a',
      }),
      event({
        id: 'google:b',
        title: '1DS - ROAS Weekly Check in',
        video_url: 'https://zoom.us/j/1',
        html_link: 'https://calendar.google.com/b',
      }),
      event({
        id: 'google:c',
        title: '1DS x ROAS Weekly Session',
        html_link: 'https://calendar.google.com/c',
      }),
    ])
    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.video_url).toBe('https://zoom.us/j/1')
    expect(normalizeAgendaTitle('1DS / ROAS Weekly Check in')).toBe('1ds roas weekly check in')
    expect(agendaTitleSimilarity('1DS / ROAS Weekly Check in', '1DS x ROAS Weekly Session')).toBe(
      0.5,
    )
  })

  it('keeps unrelated meetings that share a start time', () => {
    const deduped = dedupeCalendarAgendaEvents([
      event({ id: 'a', title: 'ROAS HQ - OFFICE HOURS (OPEN)' }),
      event({ id: 'b', title: 'Dylan Vanas and Joey Abdullah | Zoom Call' }),
    ])
    expect(deduped).toHaveLength(2)
  })

  it('preserves team_coverage when merging Mine calendars into Team', () => {
    const coverage = {
      included: [
        {
          identity_id: 'nate',
          email: 'nate@roas.co',
          display_name: 'Nate',
          match_status: 'confirmed',
          event_count: 1,
        },
      ],
      skipped: [],
      errors: [],
      totals: { directory: 1, pulled: 1, rejected: 0, capped: 0, failed: 0 },
    }
    const merged = mergeTeamAgendaWithPersonal(
      {
        success: true,
        events: [event({ id: 'team-1', account_label: 'Nate' })],
        connected: { google_calendar: true, outlook: false },
        accounts: [],
        team_available: true,
        team_coverage: coverage,
      },
      {
        success: true,
        events: [event({ id: 'mine-1', account_label: 'Dylan' })],
        connected: { google_calendar: true, outlook: false },
        accounts: [
          {
            userIntegrationId: 'u1',
            composioAccountId: 'c1',
            label: 'Dylan',
            isDefault: true,
            provider: 'google_calendar',
          },
        ],
        team_available: false,
      },
    )
    expect(merged.team_coverage).toEqual(coverage)
    expect(merged.accounts.some((a) => a.label === 'Mine')).toBe(true)
  })
})
