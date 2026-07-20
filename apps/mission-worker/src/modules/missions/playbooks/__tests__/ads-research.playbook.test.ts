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
    expect(plan?.subtasks.slice(1, 5).every((item) => item.assignTo === 'blaze')).toBe(true)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/run_ads_research_search/)
    expect(plan?.subtasks[3]?.intent.ecology).toMatch(/dylans-super-voice/)
    expect(plan?.subtasks[4]?.intent.ecology).toMatch(/roas-video-ad-scripts/)
    expect(plan?.subtasks[5]?.assignTo).toBe('human:user-1')
    expect(plan?.outOfScope).toContain('Final creative production')
    expect(plan?.outOfScope).toContain('Meta publishing or activation')
  })
})
