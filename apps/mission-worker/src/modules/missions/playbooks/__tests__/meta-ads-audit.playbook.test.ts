import { describe, expect, it } from 'vitest'
import { META_ADS_AUDIT_PLAYBOOK_ID } from '../meta-ads-audit.playbook'
import { expandMissionPlaybook } from '../mission-playbook.registry'

describe('meta-ads-audit playbook', () => {
  it('audits real Meta results, gates recommendations, and verifies approved changes', () => {
    const plan = expandMissionPlaybook({
      playbookId: META_ADS_AUDIT_PLAYBOOK_ID,
      mission: {
        id: 'mission-1',
        title: 'Meta Ads Audit',
        user_id: 'user-1',
        input: {
          playbook_kickoff: {
            reporting_period: 'last_30d',
            comparison_period: 'previous_30d',
            selected_campaigns: ['campaign-123'],
            notes: 'Prioritize cost per completed registration.',
          },
        },
      },
      workerAgentKeys: ['atlas', 'blaze'],
      managerKey: 'vibey',
    })

    expect(plan?.subtasks.map((item) => item.id)).toEqual([
      'st-audit-context',
      'st-live-account-audit',
      'st-optimization-recommendations',
      'st-gate-optimization-approval',
      'st-apply-approved-optimizations',
      'st-verify-optimization-cycle',
    ])
    expect(plan?.subtasks[0]?.assignTo).toBe('atlas')
    expect(plan?.subtasks.slice(1, 3).every((item) => item.assignTo === 'blaze')).toBe(true)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/check_meta_connection/)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/get_meta_ads_insights/)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/get_integration/)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/Composio/)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/real objective|actual result/i)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/row\.id.*ad_campaign_id/i)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/never.*meta_id.*campaign_id/i)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/specific action/i)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/evidence/i)
    expect(plan?.subtasks[3]?.assignTo).toBe('human:user-1')
    expect(plan?.subtasks[3]?.intent.ecology).toMatch(/recommendation-only/i)
    expect(plan?.subtasks[4]?.intent.ecology).toMatch(/update_ad_campaign|update_ad_set/)
    expect(plan?.subtasks[4]?.intent.ecology).toMatch(/Never activate/i)
    expect(plan?.subtasks[5]?.intent.ecology).toMatch(/post-change/i)
    expect(
      plan?.subtasks
        .filter((item) => item.outputContract?.required_action === 'save_document')
        .every((item) => item.outputContract?.expected?.forbid_em_dash === true),
    ).toBe(true)
    expect(plan?.outOfScope).toContain('Ungated Meta mutations')
    expect(plan?.assignTo).toBe('blaze')
  })
})
