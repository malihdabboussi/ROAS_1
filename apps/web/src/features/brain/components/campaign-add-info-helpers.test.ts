import { describe, expect, it } from 'vitest'
import {
  detectCampaignInfoLinkType,
  formatCampaignInfoMeetingTime,
  getCampaignInfoMeetingId,
  insertCampaignInfoTextAtPosition,
  sortCampaignInfoFathomMeetings,
} from './campaign-add-info-helpers'

describe('campaign-add-info-helpers', () => {
  it('detects supported and unsupported campaign info links', () => {
    expect(detectCampaignInfoLinkType('https://youtu.be/abc')).toEqual({
      supported: true,
      platform: 'YouTube',
    })
    expect(detectCampaignInfoLinkType('https://x.com/vibey')).toEqual({
      supported: false,
      platform: 'X/Twitter',
    })
    expect(detectCampaignInfoLinkType('not a url')).toEqual({ supported: false })
  })

  it('formats meeting timestamps and keeps invalid timestamps unknown', () => {
    expect(formatCampaignInfoMeetingTime()).toBe('Unknown time')
    expect(formatCampaignInfoMeetingTime('not-a-date')).toBe('Unknown time')
    expect(formatCampaignInfoMeetingTime(1782302400)).toContain('2026')
  })

  it('inserts transcript text at the selected cursor position', () => {
    expect(insertCampaignInfoTextAtPosition('Alpha omega', 5, 'beta')).toBe('Alpha beta omega')
    expect(insertCampaignInfoTextAtPosition('Alpha ', 6, 'beta')).toBe('Alpha beta')
    expect(insertCampaignInfoTextAtPosition('Alpha', 99, ' beta')).toBe('Alpha beta')
  })

  it('sorts Fathom meetings by newest created_at first and resolves stable ids', () => {
    const sorted = sortCampaignInfoFathomMeetings([
      { id: 'old', created_at: '2026-06-23T10:00:00.000Z' },
      { recording_id: 'new', created_at: '2026-06-24T10:00:00.000Z' },
    ])

    expect(sorted.map(getCampaignInfoMeetingId)).toEqual(['new', 'old'])
  })
})
