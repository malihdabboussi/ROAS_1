import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS,
  countUserMessageTurns,
  shouldOfferCampaignBrainNudge,
} from '../config/work-context.config'

describe('campaign brain nudge eligibility', () => {
  it('counts only user turns', () => {
    expect(
      countUserMessageTurns([
        { role: 'user' },
        { role: 'assistant' },
        { role: 'user' },
        { role: 'system' },
      ]),
    ).toBe(2)
  })

  it('does not offer at conversation start', () => {
    expect(
      shouldOfferCampaignBrainNudge({
        surface: 'general',
        userTurnCount: 1,
        minUserTurns: CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS,
      }),
    ).toBe(false)
  })

  it('offers after threshold on general without space', () => {
    expect(
      shouldOfferCampaignBrainNudge({
        surface: 'general',
        userTurnCount: CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS,
      }),
    ).toBe(true)
  })

  it('never offers when already on a campaign space or dismissed', () => {
    expect(
      shouldOfferCampaignBrainNudge({
        surface: 'general',
        spaceId: 'space-1',
        userTurnCount: 10,
      }),
    ).toBe(false)
    expect(
      shouldOfferCampaignBrainNudge({
        surface: 'general',
        campaignId: 'campaign-1',
        userTurnCount: 10,
      }),
    ).toBe(false)
    expect(
      shouldOfferCampaignBrainNudge({
        surface: 'spaces',
        userTurnCount: 10,
      }),
    ).toBe(false)
    expect(
      shouldOfferCampaignBrainNudge({
        surface: 'general',
        userTurnCount: 10,
        dismissed: true,
      }),
    ).toBe(false)
  })
})
