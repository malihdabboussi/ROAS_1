import { describe, expect, it } from 'vitest'
import { attributeMeetingClient } from './meeting-client-attribution'

const clients = [
  {
    id: '1ds',
    name: '1DS Collective',
    websiteUrl: 'https://1dscollective.com',
    campaignName: '1DS Collective',
  },
  { id: 'yasir', name: 'Yasir Khan', campaignName: 'Yasir Khan Coaching LTD' },
]

describe('attributeMeetingClient', () => {
  it('auto-maps a unique attendee domain and records the signal', () => {
    const result = attributeMeetingClient({
      title: 'Weekly check-in',
      contextText: '',
      attendees: [{ email: 'sam@1dscollective.com' }],
      clients,
    })

    expect(result.status).toBe('matched')
    expect(result.matches).toEqual([
      { id: '1ds', name: '1DS Collective', matched_by: 'invitee_domain' },
    ])
    expect(result.candidates[0]?.signals[0]).toMatchObject({ weight: 100 })
  })

  it('matches compact legacy attendee identities such as 1dscollective', () => {
    const result = attributeMeetingClient({
      title: 'Weekly check-in',
      contextText: '',
      attendees: [{ name: 'att_sam_1dscollective_com' }],
      clients,
    })

    expect(result.status).toBe('matched')
    expect(result.matches[0]?.id).toBe('1ds')
  })

  it('keeps context-only evidence as a suggestion instead of auto-mapping an internal call', () => {
    const result = attributeMeetingClient({
      title: 'Internal workflow review',
      contextText: '',
      narrativeText: 'Prepare for Yasir Khan Coaching LTD next week.',
      attendees: [{ email: 'dylan@roas.co' }],
      clients,
    })

    expect(result.status).toBe('suggested')
    expect(result.matches).toEqual([])
    expect(result.candidates[0]).toMatchObject({ id: 'yasir', confidence: 84 })
  })

  it('refuses tied evidence', () => {
    const result = attributeMeetingClient({
      title: '1DS Collective and Yasir Khan Coaching LTD review',
      contextText: '',
      attendees: [],
      clients,
    })

    expect(result.status).toBe('ambiguous')
    expect(result.matches).toEqual([])
  })
})
