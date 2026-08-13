import { describe, expect, it } from 'vitest'
import { buildMetaAdsLaunchMissionPayload } from './meta-ads-launch'

describe('buildMetaAdsLaunchMissionPayload', () => {
  it('preserves approved launch inputs and forces the launch playbook contract', () => {
    const payload = buildMetaAdsLaunchMissionPayload(
      {
        asset_links: 'https://drive.example/assets',
        ad_copy: 'Approved primary copy',
        creative_links: 'https://drive.example/creative',
        destination_url: 'https://example.com/offer',
        notes: 'Build paused and stop at approval.',
      },
      { connected: true, recommended_ad_account_id: 'act_123' },
    )

    expect(payload).toEqual({
      title: 'Meta Ads Launch',
      brief: 'Compile approved assets and build the Meta campaign in paused state.',
      priority: 'high',
      input: {
        playbook_id: 'meta-ads-launch',
        playbook_kickoff: {
          asset_links: 'https://drive.example/assets',
          ad_copy: 'Approved primary copy',
          creative_links: 'https://drive.example/creative',
          destination_url: 'https://example.com/offer',
          notes: 'Build paused and stop at approval.',
          page_grader_meta_context: {
            connected: true,
            recommended_ad_account_id: 'act_123',
          },
        },
      },
    })
  })
})
