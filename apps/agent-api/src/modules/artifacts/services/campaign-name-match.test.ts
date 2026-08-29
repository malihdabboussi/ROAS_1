import { describe, expect, it } from 'vitest'
import {
  campaignNameLookupQueries,
  campaignNameSimilarity,
  canFuzzyMatchCampaignName,
  pickUniqueFuzzyCampaign,
} from './campaign-name-match'

describe('campaign-name-match', () => {
  it('splits messy client labels on slashes', () => {
    expect(campaignNameLookupQueries('Yasir / SPeka lke a ceo')).toEqual([
      'Yasir / SPeka lke a ceo',
      'Yasir',
      'SPeka lke a ceo',
    ])
  })

  it('extracts a campaign name from a hyphen-delimited status question', () => {
    expect(
      campaignNameLookupQueries(
        "What's the current status of the VSL - MultiFamily Strategy - Ongoing VSL & Call Booking campaign?",
      ),
    ).toContain('MultiFamily Strategy')
  })

  it('matches transposition typos to Master Your Kraft and Speak Like a CEO', () => {
    expect(campaignNameSimilarity('Matser yoru kraft', 'Master Your Kraft')).toBeGreaterThan(0.72)
    expect(campaignNameSimilarity('SPeka lke a ceo', 'Speak Like a CEO')).toBeGreaterThan(0.72)
  })

  it('does not fuzzy-match a single short token', () => {
    expect(canFuzzyMatchCampaignName('Yasir')).toBe(false)
  })

  it('picks a unique fuzzy campaign from accessible names', () => {
    const match = pickUniqueFuzzyCampaign(
      ['Matser yoru kraft'],
      [
        { id: 'kraft', name: 'Master Your Kraft' },
        { id: 'speak', name: 'Speak Like a CEO' },
        { id: 'general', name: 'General' },
      ],
    )
    expect(match).toEqual({ id: 'kraft', name: 'Master Your Kraft' })
  })

  it('uses the client phrase after a slash', () => {
    const match = pickUniqueFuzzyCampaign(campaignNameLookupQueries('Yasir / SPeka lke a ceo'), [
      { id: 'kraft', name: 'Master Your Kraft' },
      { id: 'speak', name: 'Speak Like a CEO' },
    ])
    expect(match).toEqual({ id: 'speak', name: 'Speak Like a CEO' })
  })

  it('resolves a campaign name embedded in a natural-language status question', () => {
    const match = pickUniqueFuzzyCampaign(
      campaignNameLookupQueries(
        "What's the current status of the VSL - MultiFamily Strategy - Ongoing VSL & Call Booking campaign?",
      ),
      [
        { id: 'multifamily', name: 'Multifamily Strategy' },
        { id: 'black-swan', name: 'Black Swan Group - Multi-family Strategy' },
        { id: 'power-circle', name: 'Power Circle - Multi-family Strategy' },
        { id: 'general', name: 'General' },
      ],
    )

    expect(match).toEqual({ id: 'multifamily', name: 'Multifamily Strategy' })
  })
})
