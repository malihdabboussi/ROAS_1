import { describe, expect, it } from 'vitest'
import {
  expandMissionPlaybook,
  expandWebinarFulfillmentPlaybook,
  WEBINAR_FULFILLMENT_PLAYBOOK_ID,
} from '../webinar-fulfillment.playbook'

describe('webinar-fulfillment playbook', () => {
  const base = {
    playbookId: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
    mission: {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Impact webinar package',
      brief: 'Fulfill Impact webinar',
      user_id: '22222222-2222-2222-2222-222222222222',
      org_id: '33333333-3333-3333-3333-333333333333',
      input: {
        playbook_id: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
        playbook_kickoff: { start_at: 'pre_call', notes: 'Kickoff notes' },
      },
    },
    workerAgentKeys: ['strategist', 'copywriter'],
    managerKey: 'vibey',
  }

  it('expands pre_call into skills 1→2→3 then human gate', () => {
    const plan = expandWebinarFulfillmentPlaybook(base)
    expect(plan.subtasks.map((s) => s.id)).toEqual([
      'st-precall',
      'st-strategy-v2',
      'st-launch-brief',
      'st-gate-1',
    ])
    expect(plan.subtasks[0]?.assignTo).toBe('strategist')
    expect(plan.subtasks[3]?.assignTo).toBe(`human:${base.mission.user_id}`)
    expect(plan.subtasks[1]?.dependsOn).toEqual(['st-precall'])
    expect(plan.subtasks[3]?.dependsOn).toEqual(['st-launch-brief'])
    expect(plan.outOfScope.join(' ')).toMatch(/Phase B/i)
  })

  it('skips precall when start_at is post_call', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      mission: {
        ...base.mission,
        input: { playbook_kickoff: { start_at: 'post_call' } },
      },
    })
    expect(plan.subtasks.map((s) => s.id)).toEqual([
      'st-strategy-v2',
      'st-launch-brief',
      'st-gate-1',
    ])
  })

  it('starts at launch brief only when requested', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      mission: {
        ...base.mission,
        input: { playbook_kickoff: { start_at: 'launch_brief' } },
      },
    })
    expect(plan.subtasks.map((s) => s.id)).toEqual(['st-launch-brief', 'st-gate-1'])
  })

  it('returns null for unknown playbook ids', () => {
    expect(expandMissionPlaybook({ ...base, playbookId: 'unknown' })).toBeNull()
  })

  it('omits human gate when mission has no org_id', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      mission: { ...base.mission, org_id: null },
    })
    expect(plan.subtasks.map((s) => s.id)).toEqual([
      'st-precall',
      'st-strategy-v2',
      'st-launch-brief',
    ])
    expect(plan.outOfScope.join(' ')).toMatch(/Gate 1/i)
  })
})
