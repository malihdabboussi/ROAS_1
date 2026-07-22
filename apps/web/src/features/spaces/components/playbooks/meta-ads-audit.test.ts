import { describe, expect, it } from 'vitest'
import { buildMetaAdsAuditMissionPayload } from './meta-ads-audit'

describe('buildMetaAdsAuditMissionPayload', () => {
  it('preserves reporting scope and mounted Meta context', () => {
    const payload = buildMetaAdsAuditMissionPayload(
      {
        reporting_period: 'last_14d',
        comparison_period: 'previous_14d',
        selected_campaigns: 'Campaign One, Campaign Two\nCampaign Three',
        notes: 'Prioritize registration cost.',
      },
      { connected: true, recommended_ad_account_id: 'act_123' },
    )

    expect(payload.input).toEqual({
      playbook_id: 'meta-ads-audit',
      playbook_kickoff: {
        reporting_period: 'last_14d',
        comparison_period: 'previous_14d',
        selected_campaigns: ['Campaign One', 'Campaign Two', 'Campaign Three'],
        notes: 'Prioritize registration cost.',
        page_grader_meta_context: { connected: true, recommended_ad_account_id: 'act_123' },
      },
    })
  })
})
