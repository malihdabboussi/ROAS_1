import { describe, expect, it } from 'vitest'
import {
  rankRelatedCalls,
  relatedCallCandidateFromItem,
  type RelatedCallCandidate,
} from './meeting-related-calls'

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
  it('keeps same-client calls and drops a different mapped client even with a recording', () => {
    const current = call({
      id: 'now',
      title: 'Cydcor weekly reputation monitoring and response',
      clientCampaign: {
        client_id: 'cydcor',
        client_name: 'Cydcor',
        campaign_id: 'cydcor-launch',
        campaign_name: 'Launch',
      },
      participantEmails: ['dylan@roas.co', 'nicholas@cydcor.com'],
    })
    const ranked = rankRelatedCalls(current, [
      call({
        id: 'barber',
        title: 'Barber webinar offer strategy review',
        clientCampaign: {
          client_id: 'barber',
          client_name: 'Barber',
          campaign_id: 'barber-webinar',
          campaign_name: 'Webinar',
        },
        recordingUrl: 'https://fathom.video/calls/barber',
        callStatus: 'completed',
        callDate: '2026-08-14T17:00:00.000Z',
      }),
      call({
        id: 'cydcor-last-week',
        title: 'Cydcor weekly reputation monitoring and response',
        clientCampaign: {
          client_id: 'cydcor',
          client_name: 'Cydcor',
          campaign_id: 'cydcor-launch',
          campaign_name: 'Launch',
        },
        recordingUrl: 'https://fathom.video/calls/cydcor',
        callStatus: 'completed',
        callDate: '2026-08-11T17:00:00.000Z',
      }),
    ])

    expect(ranked.map((row) => row.id)).toEqual(['cydcor-last-week'])
  })

  it('reads object client/campaign mappings from space items', () => {
    const candidate = relatedCallCandidateFromItem({
      id: 'item-1',
      title: 'Offer Brainstorm',
      custom_data: {
        client_campaign: {
          client_id: '1ds',
          campaign_id: 'launch',
          campaign_name: 'Launch',
        },
        participant_emails: ['dylan@roas.co'],
      },
    })
    expect(candidate.clientCampaign).toEqual({
      client_id: '1ds',
      campaign_id: 'launch',
      campaign_name: 'Launch',
    })
  })

  it('does not treat a shared host plus generic title words as related', () => {
    const current = call({
      id: 'now',
      title: '1DS community growth strategy session',
      participantEmails: ['dylan@roas.co'],
    })
    const ranked = rankRelatedCalls(current, [
      call({
        id: 'other-client',
        title: 'Jackie Revenue House masterclass launch strategy',
        participantEmails: ['dylan@roas.co'],
        recordingUrl: 'https://fathom.video/calls/jackie',
        callStatus: 'completed',
      }),
    ])
    expect(ranked).toEqual([])
  })

  it('relates unmapped series by a distinctive title token', () => {
    const current = call({
      id: 'now',
      title: 'Cydcor weekly reputation monitoring',
      participantEmails: ['dylan@roas.co'],
    })
    const ranked = rankRelatedCalls(current, [
      call({
        id: 'prior',
        title: 'Cydcor weekly reputation monitoring',
        participantEmails: ['dylan@roas.co'],
        callDate: '2026-08-11T17:00:00.000Z',
      }),
    ])
    expect(ranked.map((row) => row.id)).toEqual(['prior'])
  })

  it('does not return the current call', () => {
    const current = call({ id: 'now', title: 'Offer Brainstorm' })
    expect(rankRelatedCalls(current, [current])).toEqual([])
  })
})
