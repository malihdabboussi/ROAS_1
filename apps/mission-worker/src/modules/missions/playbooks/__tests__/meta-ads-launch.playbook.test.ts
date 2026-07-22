import { describe, expect, it } from 'vitest'
import { META_ADS_LAUNCH_PLAYBOOK_ID } from '../meta-ads-launch.playbook'
import { expandMissionPlaybook } from '../mission-playbook.registry'

describe('meta-ads-launch playbook', () => {
  it('keeps Blaze in media buying and gates a paused Meta build', () => {
    const plan = expandMissionPlaybook({
      playbookId: META_ADS_LAUNCH_PLAYBOOK_ID,
      mission: {
        id: 'mission-1',
        title: 'Launch ads',
        user_id: 'user-1',
        input: {
          playbook_kickoff: {
            page_grader_meta_context: { recommended_ad_account_id: 'act_123' },
          },
        },
      },
      workerAgentKeys: ['blaze'],
      managerKey: 'vibey',
    })

    expect(plan?.subtasks.map((item) => item.id)).toEqual([
      'st-launch-manifest',
      'st-gate-launch-approval',
      'st-build-paused-meta',
      'st-gate-activation',
    ])
    expect(plan?.subtasks[0]?.assignTo).toBe('blaze')
    expect(plan?.subtasks[1]?.assignTo).toBe('human:user-1')
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/PAUSED state/)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/get_integration/)
    expect(plan?.subtasks[2]?.intent.ecology).toMatch(/Composio/)
    expect(plan?.subtasks[3]?.intent.ecology).toMatch(/Activate manually/i)
    expect(plan?.subtasks[0]?.outputContract?.expected?.forbid_em_dash).toBe(true)
    expect(plan?.subtasks[2]?.outputContract?.expected?.forbid_em_dash).toBe(true)
    expect(plan?.outOfScope).toContain('Creative design or copywriting')
    expect(plan?.outOfScope).toContain('PDF deliverables')
  })
})
