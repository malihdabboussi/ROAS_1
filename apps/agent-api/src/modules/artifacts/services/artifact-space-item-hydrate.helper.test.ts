import { describe, expect, it } from 'vitest'
import {
  buildSpaceItemMeetingHydration,
  shouldIncludeSpaceItemHydrationFlag,
} from './artifact-space-item-hydrate.helper'

describe('artifact-space-item-hydrate.helper', () => {
  it('hydrates meeting fields from Fathom custom_data', () => {
    const meeting = buildSpaceItemMeetingHydration({
      id: 'item-1',
      source: 'fathom',
      description: 'Discussed pricing and founding offer.',
      custom_data: {
        entry_type: 'call',
        call_kind: 'team',
        call_date: '2026-07-20',
        recording_url: 'https://fathom.video/calls/1',
        fathom_url: 'https://fathom.video/calls/1',
        attendees: ['opt-1'],
        client_campaign: {
          client_id: 'client-1',
          client_name: '1DS Collective',
          campaign_id: 'camp-a',
          campaign_name: 'Launch',
          roas_space_id: 'space-1',
        },
        external_automation: {
          provider: 'fathom',
          meeting_id: '762669050',
          transcript_entries: [{ speaker: 'Nate', text: 'Hello' }],
        },
      },
    })

    expect(meeting).toMatchObject({
      entry_type: 'call',
      call_kind: 'team',
      recording_url: 'https://fathom.video/calls/1',
      transcript_link: 'https://fathom.video/calls/1',
      fathom_meeting_id: '762669050',
      summary: 'Discussed pricing and founding offer.',
      client_campaign: {
        client_id: 'client-1',
        client_name: '1DS Collective',
        campaign_id: 'camp-a',
        campaign_name: 'Launch',
        roas_space_id: 'space-1',
      },
    })
    expect(meeting?.transcript_entries).toEqual([{ speaker: 'Nate', text: 'Hello' }])
  })

  it('returns null for non-meeting items', () => {
    expect(
      buildSpaceItemMeetingHydration({
        id: 'task-1',
        source: 'manual',
        title: 'Rewrite About page',
        custom_data: { category: 'follow_up' },
      }),
    ).toBeNull()
  })

  it('defaults hydration flags to include unless explicitly false', () => {
    expect(shouldIncludeSpaceItemHydrationFlag({}, 'include_deliverables')).toBe(true)
    expect(
      shouldIncludeSpaceItemHydrationFlag({ include_deliverables: false }, 'include_deliverables'),
    ).toBe(false)
    expect(
      shouldIncludeSpaceItemHydrationFlag(
        { include_deliverables: 'false' },
        'include_deliverables',
      ),
    ).toBe(false)
    expect(
      shouldIncludeSpaceItemHydrationFlag({ include_deliverables: true }, 'include_deliverables'),
    ).toBe(true)
  })
})
