import { describe, expect, it } from 'vitest'
import { ADS_RESEARCH_PLAYBOOK_ID, buildAdsResearchMissionPayload } from './ads-research'

describe('buildAdsResearchMissionPayload', () => {
  it('creates a reusable research kickoff with visual search context', () => {
    const payload = buildAdsResearchMissionPayload({
      prompt: 'Find new webinar ads',
      depth: 'deep',
      reporting_period: 'last_30d',
      selected_campaigns: 'Campaign A\n120123',
      competitors: 'Competitor One, Competitor Two',
      links: 'https://example.com/reference',
    })

    expect(payload.title).toBe('Ads Research')
    expect(payload.input.playbook_id).toBe(ADS_RESEARCH_PLAYBOOK_ID)
    expect(payload.input.playbook_kickoff).toMatchObject({
      prompt: 'Find new webinar ads',
      depth: 'deep',
      reporting_period: 'last_30d',
      selected_campaigns: ['Campaign A', '120123'],
      competitors: ['Competitor One', 'Competitor Two'],
      links: 'https://example.com/reference',
    })
  })
})
