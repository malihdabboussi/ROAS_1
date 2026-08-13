import { describe, expect, it } from 'vitest'
import { buildCampaignNotesFromPrepContext } from '../meetings-precall-campaign-notes'

describe('buildCampaignNotesFromPrepContext', () => {
  it('builds dated client campaign notes from Page Grader and Meta evidence', () => {
    const result = buildCampaignNotesFromPrepContext({
      active_campaigns: [
        { id: 'campaign-1', name: 'Webinar', status: 'active', next_action: 'Hold through event.' },
      ],
      latest_meta_performance: {
        performance: {
          campaigns: [
            {
              campaign_id: 'campaign-1',
              campaign_name: 'Webinar',
              current_range: { since: '2026-08-05', until: '2026-08-11' },
              current: { spend: 500, leads: 25, cpl: 20, ctr: 1.5 },
              prior: { cpl: 25 },
            },
          ],
        },
      },
    })

    expect(result).toContain('2026-08-05–2026-08-11')
    expect(result).toContain('25 leads')
    expect(result).toContain('CPL improved 20.0%')
    expect(result).toContain('Hold through event.')
    expect(result).not.toContain('State:')
    expect(result).not.toContain('Evidence:')
    expect(result).not.toContain('Recommended next move:')
  })

  it('pairs differently named webinar records and gives held VSL work a specific gate', () => {
    const result = buildCampaignNotesFromPrepContext({
      active_campaigns: [
        { name: 'Master Your Kraft · Webinar', status: 'building' },
        { name: 'Master Your Kraft · VSL', platform_status: 'on_hold_closed' },
      ],
      latest_meta_performance: {
        performance: {
          campaigns: [
            {
              campaign_name: 'WEBINAR - AUGUST 17 - CBO',
              current_range: { since: '2026-08-10', until: '2026-08-11' },
              current: { spend: 159.3, leads: 18, cpl: 8.85 },
              prior: {},
            },
          ],
        },
      },
    })

    expect(result).toContain('18 leads')
    expect(result).toContain('Complete final QA before launch')
    expect(result).toContain('Keep this on hold until funnel QA')
  })

  it('does not expose missing data plumbing in client-facing campaign notes', () => {
    const result = buildCampaignNotesFromPrepContext({
      active_campaigns: [{ name: 'Creative Test', status: 'active' }],
      latest_meta_performance: { performance: { campaigns: [] } },
    })

    expect(result).toContain('Creative Test')
    expect(result).not.toMatch(/not supplied|source|snapshot|diagnos/i)
  })
})
