import { describe, expect, it } from 'vitest'
import {
  clientCampaignMapping,
  fathomEventFromSpaceItem,
  normalizeFathomMeeting,
  resolveMeetingClients,
} from '../page-grader-meeting-sync.service'

const clients = [
  { id: 'client-mfs', name: 'Multifamily Strategy' },
  { id: 'client-sakha', name: 'Sakha Media Group' },
]

describe('Page Grader meeting sync', () => {
  it('turns a unique client match into the mapping rendered by All Meetings', () => {
    expect(
      clientCampaignMapping(
        { id: 'client-one-percent', name: 'The One Percent Life' },
        {
          'client-one-percent': {
            campaign_id: 'campaign-one-percent',
            campaign_name: 'The One Percent Life',
            space_id: 'space-general',
            space_title: 'General',
          },
        },
      ),
    ).toEqual({
      client_id: 'client-one-percent',
      client_name: 'The One Percent Life',
      campaign_id: 'campaign-one-percent',
      campaign_name: 'The One Percent Life',
      space_id: 'space-general',
      space_title: 'General',
    })
  })

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

  it('preserves saved attendee evidence when replaying a meeting catch-up', () => {
    const event = fathomEventFromSpaceItem({
      title: '1DS x ROAS Weekly Session',
      description: 'Weekly client call',
      custom_data: {
        external_automation: { meeting_id: 'meeting-1' },
        participant_emails: ['john@1dscollective.com'],
        attendees: ['att_sam_1dscollective_com', 'att_dylan_dylanvanas_com'],
      },
    })

    expect(event.calendar_invitees).toEqual([
      { email: 'john@1dscollective.com' },
      { email: 'sam@1dscollective.com', name: 'att_sam_1dscollective_com' },
      { email: 'dylan@dylanvanas.com', name: 'att_dylan_dylanvanas_com' },
    ])
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

  it('keeps a unique meeting match suitable for the Client Workspace mapping', () => {
    const matches = resolveMeetingClients({
      meeting: {
        source_meeting_id: 'meeting-adam',
        meeting_title: 'Adam Lamb x ROAS Weekly Meeting',
        meeting_date: '2026-08-19T19:26:45.000Z',
      },
      clients: [{ id: 'one-percent', name: 'The One Percent Life' }],
      scopeMap: {},
      contexts: [
        {
          space_id: 'meetings',
          campaign_id: null,
          title: 'Adam Lamb x ROAS Weekly Meeting',
          description: 'Client call for The One Percent Life',
          custom_data: {},
        },
      ],
    })

    expect(matches).toEqual([
      { id: 'one-percent', name: 'The One Percent Life', matched_by: 'context_alias' },
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

  it('treats a manually selected Client Workspace as authoritative attribution', () => {
    const matches = resolveMeetingClients({
      meeting: {
        source_meeting_id: 'meeting-manual',
        meeting_title: 'Weekly review',
        meeting_date: '2026-08-26T16:00:00.000Z',
      },
      clients,
      scopeMap: {},
      contexts: [
        {
          space_id: 'meetings',
          campaign_id: null,
          title: null,
          description: null,
          custom_data: {
            client_campaign_source: 'manual',
            client_campaign: { client_id: 'client-sakha' },
          },
        },
      ],
    })

    expect(matches).toEqual([
      { id: 'client-sakha', name: 'Sakha Media Group', matched_by: 'explicit_client' },
    ])
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
    ).toEqual([{ id: 'client-mfs', name: 'Multifamily Strategy', matched_by: 'title_alias' }])

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

  it('matches a client from invitee email domain before title inference', () => {
    const matches = resolveMeetingClients({
      meeting: {
        source_meeting_id: 'meeting-email',
        meeting_title: 'Weekly strategy',
        meeting_date: '2026-08-20T16:00:00.000Z',
        attendees: [{ email: 'christian@multifamilystrategy.com', name: 'Christian' }],
      },
      clients: [
        {
          id: 'client-mfs',
          name: 'Multifamily Strategy',
          website_url: 'https://www.multifamilystrategy.com',
        },
        { id: 'client-sakha', name: 'Sakha Media Group', website_url: 'https://sakha.example' },
      ],
      scopeMap: {},
      contexts: [],
    })

    expect(matches).toEqual([
      { id: 'client-mfs', name: 'Multifamily Strategy', matched_by: 'invitee_domain' },
    ])
  })
})
