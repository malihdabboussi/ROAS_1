import { describe, expect, it } from 'vitest'
import { ADS_RESEARCH_PLAYBOOK_ID } from '../ads-research.playbook'
import { expandMissionPlaybook } from '../mission-playbook.registry'

describe('ads-research playbook', () => {
  it('coordinates context, current performance, visual market research, recommendations, and review', () => {
    const plan = expandMissionPlaybook({
      playbookId: ADS_RESEARCH_PLAYBOOK_ID,
      mission: {
        id: 'mission-1',
        title: 'Ads Research',
        user_id: 'user-1',
        input: {
          playbook_kickoff: {
            prompt: 'Find new webinar angles',
            depth: 'deep',
            reporting_period: 'last_30d',
            selected_campaigns: ['campaign-123'],
          },
        },
      },
      workerAgentKeys: ['atlas', 'blaze'],
      managerKey: 'vibey',
    })

    expect(plan?.subtasks.map((item) => item.id)).toEqual([
      'st-research-context',
      'st-current-ads-analysis',
      'st-competitive-research',
      'st-ad-recommendations',
      'st-draft-video-scripts',
      'st-gate-research-review',
    ])
    expect(plan?.subtasks[0]?.assignTo).toBe('atlas')
    expect(plan?.subtasks[0]?.outputContract?.expected?.title).toBe(
      'ADS-R#0 - Verified Campaign Research Context',
    )
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/get_campaign/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/get_space/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/search_customer_brain/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/Client identity check/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/competitor.*client truth/i)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/block the subtask/i)
    expect(plan?.subtasks.slice(1, 5).every((item) => item.assignTo === 'blaze')).toBe(true)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/run_ads_research_search/)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/at least 12/i)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/at least 3/i)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/thumbnail|snapshot/i)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/mission-linked/i)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/check_meta_connection/)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/get_integration/)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/Composio/)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(/Do not infer/)
    expect(plan?.subtasks[1]?.intent.ecology).toMatch(
      /ADS-R#0 - Verified Campaign Research Context/,
    )
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/never client facts/i)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/unique visual_reference_count/)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/save_document exactly once/)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/10,000 characters/)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/Do not create a draft Doc/)
    expect(plan?.subtasks[3]?.intent.ecology).toMatch(/dylans-super-voice/)
    expect(plan?.subtasks[3]?.intent.ecology).toMatch(/visual reference/i)
    expect(plan?.subtasks[3]?.intent.ecology).toMatch(/Hook.*Body.*CTA/i)
    expect(plan?.subtasks[4]?.intent.ecology).toMatch(/roas-video-ad-scripts/)
    expect(plan?.subtasks[5]?.assignTo).toBe('human:user-1')
    expect(plan?.subtasks[5]?.intent.ecology).toMatch(/12 visual references/i)
    expect(plan?.outOfScope).toContain('Final creative production')
    expect(plan?.outOfScope).toContain('Meta publishing or activation')
  })
})
