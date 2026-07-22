import { describe, expect, it } from 'vitest'
import { normalizeFathomMeeting, resolveMeetingClients } from '../page-grader-meeting-sync.service'

const clients = [
  { id: 'client-mfs', name: 'Multifamily Strategy' },
  { id: 'client-sakha', name: 'Sakha Media Group' },
]

describe('Page Grader meeting sync', () => {
  it('normalizes a Fathom call into the Page Grader meeting contract', () => {
    const result = normalizeFathomMeeting({
      recording_id: 'recording-1',
      title: 'Multifamily weekly call',
      recording_start_time: '2026-07-22T16:00:00.000Z',
      recording_end_time: '2026-07-22T17:00:00.000Z',
      share_url: 'https://fathom.video/share/recording-1',
      calendar_invitees: [{ name: 'Christian Osgood', email: 'christian@example.com' }],
      transcript: [{ speaker: { display_name: 'Christian' }, text: 'Let us relaunch next week.' }],
      default_summary: { markdown_formatted: 'Agreed to relaunch the webinar.' },
      action_items: [{ description: 'Prepare the relaunch brief.' }],
    })

    expect(result).toMatchObject({
      source_meeting_id: 'recording-1',
      meeting_title: 'Multifamily weekly call',
      meeting_duration_minutes: 60,
      source_url: 'https://fathom.video/share/recording-1',
      transcript: 'Christian: Let us relaunch next week.',
      summary: 'Agreed to relaunch the webinar.',
    })
    expect(result.sync_hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('uses an explicit or mapped ROAS client before title inference', () => {
    const matches = resolveMeetingClients({
      meeting: {
        source_meeting_id: 'meeting-1',
        meeting_title: 'Sakha Media Group mentioned during the call',
        meeting_date: '2026-07-22T16:00:00.000Z',
      },
      clients,
      scopeMap: {
        'client-mfs': { campaign_id: 'campaign-mfs', space_id: 'space-mfs' },
      },
      contexts: [
        {
          space_id: 'space-mfs',
          campaign_id: 'campaign-mfs',
          title: null,
          description: null,
          custom_data: {},
        },
      ],
    })

    expect(matches).toEqual([
      { id: 'client-mfs', name: 'Multifamily Strategy', matched_by: 'roas_campaign_mapping' },
    ])
  })

  it('allows one internal call to attach to multiple explicitly mapped clients', () => {
    const matches = resolveMeetingClients({
      meeting: {
        source_meeting_id: 'meeting-2',
        meeting_title: 'Internal account review',
        meeting_date: '2026-07-22T16:00:00.000Z',
      },
      clients,
      scopeMap: {},
      contexts: [
        {
          space_id: 'space-team',
          campaign_id: null,
          title: null,
          description: null,
          custom_data: { page_grader: { client_ids: ['client-mfs', 'client-sakha'] } },
        },
      ],
    })

    expect(matches.map((match) => match.id)).toEqual(['client-mfs', 'client-sakha'])
  })

  it('matches one unique client name but refuses an ambiguous multi-client call', () => {
    const base = {
      clients,
      scopeMap: {},
      contexts: [],
    }
    expect(
      resolveMeetingClients({
        ...base,
        meeting: {
          source_meeting_id: 'meeting-3',
          meeting_title: 'Multifamily Strategy weekly review',
          meeting_date: '2026-07-22T16:00:00.000Z',
        },
      }),
    ).toEqual([
      { id: 'client-mfs', name: 'Multifamily Strategy', matched_by: 'unique_client_name' },
    ])

    expect(
      resolveMeetingClients({
        ...base,
        meeting: {
          source_meeting_id: 'meeting-4',
          meeting_title: 'Multifamily Strategy and Sakha Media Group review',
          meeting_date: '2026-07-22T16:00:00.000Z',
        },
      }),
    ).toEqual([])
  })
})
