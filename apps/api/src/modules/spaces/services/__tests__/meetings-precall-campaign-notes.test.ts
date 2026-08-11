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
  })
})
