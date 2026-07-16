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
    workerAgentKeys: ['strategist', 'copywriter', 'ads_manager', 'designer'],
    managerKey: 'vibey',
  }

  it('expands pre_call into Phase A→Gate1→research→copy→Gate2→Phase C→Gate3→deck', () => {
    const plan = expandWebinarFulfillmentPlaybook(base)
    expect(plan.subtasks.map((s) => s.id)).toEqual([
      'st-precall',
      'st-strategy-v2',
      'st-launch-brief',
      'st-gate-1',
      'st-market-research',
      'st-copy-package',
      'st-gate-2',
      'st-ad-design',
      'st-image-brief',
      'st-funnel-design',
      'st-deck-outline',
      'st-gate-3',
      'st-deck-build',
    ])
    expect(plan.subtasks[0]?.assignTo).toBe('strategist')
    expect(plan.subtasks.find((s) => s.id === 'st-gate-1')?.assignTo).toBe(
      `human:${base.mission.user_id}`,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-market-research')?.assignTo).toBe('ads_manager')
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.assignTo).toBe('copywriter')
    expect(plan.subtasks.find((s) => s.id === 'st-funnel-design')?.assignTo).toBe('designer')
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.outputContract?.expected).toEqual({
      title: 'Copy Package',
    })
    expect(plan.subtasks.find((s) => s.id === 'st-gate-2')?.intent.ecology).toMatch(
      /re-run ONLY the owning skill/i,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-funnel-design')?.intent.ecology).toMatch(
      /WITHOUT reshaping/,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-deck-build')?.intent.ecology).toMatch(/NEVER export/)
    expect(plan.capability_gap.exists).toBe(true)
    expect(plan.capability_gap.note).toMatch(/roas-webinar-emails/)
  })

  it('skips precall when start_at is post_call but keeps B/C', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      mission: {
        ...base.mission,
        input: { playbook_kickoff: { start_at: 'post_call' } },
      },
    })
    expect(plan.subtasks.map((s) => s.id).slice(0, 4)).toEqual([
      'st-strategy-v2',
      'st-launch-brief',
      'st-gate-1',
      'st-market-research',
    ])
    expect(plan.subtasks.some((s) => s.id === 'st-copy-package')).toBe(true)
  })

  it('starts at launch brief only when requested', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      mission: {
        ...base.mission,
        input: { playbook_kickoff: { start_at: 'launch_brief' } },
      },
    })
    expect(plan.subtasks.map((s) => s.id).slice(0, 3)).toEqual([
      'st-launch-brief',
      'st-gate-1',
      'st-market-research',
    ])
  })

  it('returns null for unknown playbook ids', () => {
    expect(expandMissionPlaybook({ ...base, playbookId: 'unknown' })).toBeNull()
  })

  it('omits human gates when mission has no org_id', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      mission: { ...base.mission, org_id: null },
    })
    const ids = plan.subtasks.map((s) => s.id)
    expect(ids).not.toContain('st-gate-1')
    expect(ids).not.toContain('st-gate-2')
    expect(ids).not.toContain('st-gate-3')
    expect(ids).toContain('st-market-research')
    expect(ids).toContain('st-copy-package')
    expect(ids).toContain('st-deck-build')
    expect(plan.subtasks.find((s) => s.id === 'st-market-research')?.dependsOn).toEqual([
      'st-launch-brief',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-ad-design')?.dependsOn).toEqual([
      'st-copy-package',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-deck-build')?.dependsOn).toEqual([
      'st-deck-outline',
    ])
  })

  it('wires Gate 2 REVIEW MAP owners for surgical reject', () => {
    const plan = expandWebinarFulfillmentPlaybook(base)
    const gate2 = plan.subtasks.find((s) => s.id === 'st-gate-2')
    expect(gate2?.intent.ecology).toContain('3→roas-ad-copy')
    expect(gate2?.intent.ecology).toContain('{{run.review_feedback}}')
  })
})
