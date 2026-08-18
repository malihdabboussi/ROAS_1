import { describe, expect, it } from 'vitest'
import { rankRelatedCalls, type RelatedCallCandidate } from './meeting-related-calls'

function call(
  partial: Partial<RelatedCallCandidate> & Pick<RelatedCallCandidate, 'id' | 'title'>,
): RelatedCallCandidate {
  return {
    callDate: null,
    callStatus: null,
    recordingUrl: null,
    clientCampaign: null,
    participantEmails: [],
    ...partial,
  }
}

describe('rankRelatedCalls', () => {
  it('prefers the same client/campaign, then overlapping people, then a recording', () => {
    const current = call({
      id: 'now',
      title: 'Offer Brainstorm',
      clientCampaign: '1ds:launch',
      participantEmails: ['dylan@roas.co', 'nicholas@example.com'],
    })
    const ranked = rankRelatedCalls(current, [
      call({
        id: 'title-only',
        title: 'Offer Brainstorm',
        callDate: '2026-08-04T17:00:00.000Z',
      }),
      call({
        id: 'people',
        title: 'Check-in',
        participantEmails: ['dylan@roas.co', 'nicholas@example.com'],
        callDate: '2026-08-11T17:00:00.000Z',
      }),
      call({
        id: 'client-recorded',
        title: 'Offer Brainstorm',
        clientCampaign: '1ds:launch',
        callStatus: 'completed',
        recordingUrl: 'https://fathom.video/calls/1',
        callDate: '2026-08-11T17:00:00.000Z',
      }),
    ])

    expect(ranked.map((row) => row.id)).toEqual(['client-recorded', 'people', 'title-only'])
  })

  it('does not return the current call', () => {
    const current = call({ id: 'now', title: 'Offer Brainstorm' })
    expect(rankRelatedCalls(current, [current])).toEqual([])
  })
})
