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

  it('expands the approved Atlas, strategy, copy, production, and media flow', () => {
    const plan = expandWebinarFulfillmentPlaybook(base)
    expect(plan.subtasks.map((s) => s.id)).toEqual([
      'st-atlas-context',
      'st-precall',
      'st-gate-precall',
      'st-atlas-transcript',
      'st-strategy-v2',
      'st-launch-brief',
      'st-gate-strategy',
      'st-market-research',
      'st-copy-package',
      'st-gate-copy',
      'st-ad-design',
      'st-image-brief',
      'st-funnel-design',
      'st-deck-bones',
      'st-media-plan',
      'st-gate-production',
    ])
    expect(plan.subtasks[0]?.assignTo).toBe('atlas')
    expect(plan.subtasks.find((s) => s.id === 'st-gate-precall')?.assignTo).toBe(
      `human:${base.mission.user_id}`,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-market-research')?.assignTo).toBe('ads_manager')
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.assignTo).toBe('copywriter')
    expect(plan.subtasks.find((s) => s.id === 'st-funnel-design')?.assignTo).toBe('designer')
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.outputContract?.expected).toEqual(
      {
        title: 'WEB#5 — Copy Package',
      },
    )
    expect(plan.subtasks.find((s) => s.id === 'st-ad-design')?.assignTo).toBe('designer')
    expect(plan.subtasks.find((s) => s.id === 'st-media-plan')?.assignTo).toBe('ads_manager')
    expect(plan.subtasks.find((s) => s.id === 'st-gate-copy')?.intent.ecology).toMatch(
      /re-run ONLY the owning skill/i,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-funnel-design')?.intent.ecology).toMatch(
      /WITHOUT reshaping/,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-deck-bones')?.intent.ecology).toMatch(
      /10.?20 slides/i,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-deck-bones')?.intent.ecology).toMatch(
      /offer stack/i,
    )
    expect(plan.capability_gap).toEqual({ exists: false, note: '', suggested_hire: '' })
    expect(plan.harness.contextSnapshot.missing).not.toContain(
      'roas-webinar-emails skill (Copy Package section 2)',
    )
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.intent.ecology).not.toMatch(
      /if that skill is missing/i,
    )
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
      'st-atlas-context',
      'st-atlas-transcript',
      'st-strategy-v2',
      'st-launch-brief',
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
      'st-atlas-context',
      'st-launch-brief',
      'st-gate-strategy',
    ])
  })

  it('returns null for unknown playbook ids', () => {
    expect(expandMissionPlaybook({ ...base, playbookId: 'unknown' })).toBeNull()
  })

  it('resolves name-derived campaign agent keys to playbook roles', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      workerAgentKeys: ['nate', 'ivy', 'blaze', 'lux'],
    })
    expect(plan.subtasks.find((s) => s.id === 'st-precall')?.assignTo).toBe('nate')
    expect(plan.subtasks.find((s) => s.id === 'st-market-research')?.assignTo).toBe('blaze')
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.assignTo).toBe('ivy')
    expect(plan.subtasks.find((s) => s.id === 'st-funnel-design')?.assignTo).toBe('lux')
  })

  it('includes human gates for personal missions (no org_id)', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      mission: { ...base.mission, org_id: null },
    })
    const ids = plan.subtasks.map((s) => s.id)
    expect(ids).toContain('st-gate-precall')
    expect(ids).toContain('st-gate-strategy')
    expect(ids).toContain('st-gate-copy')
    expect(ids).toContain('st-gate-production')
    expect(plan.subtasks.find((s) => s.id === 'st-gate-precall')?.assignTo).toBe(
      `human:${base.mission.user_id}`,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-market-research')?.dependsOn).toEqual([
      'st-gate-strategy',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-ad-design')?.dependsOn).toEqual(['st-gate-copy'])
    expect(plan.subtasks.find((s) => s.id === 'st-media-plan')?.dependsOn).toEqual([
      'st-ad-design',
      'st-image-brief',
      'st-funnel-design',
      'st-deck-bones',
    ])
  })

  it('wires Gate 2 REVIEW MAP owners for surgical reject', () => {
    const plan = expandWebinarFulfillmentPlaybook(base)
    const gate2 = plan.subtasks.find((s) => s.id === 'st-gate-copy')
    expect(gate2?.intent.ecology).toContain('3→roas-ad-copy')
    expect(gate2?.intent.ecology).toContain('{{run.review_feedback}}')
  })
})
