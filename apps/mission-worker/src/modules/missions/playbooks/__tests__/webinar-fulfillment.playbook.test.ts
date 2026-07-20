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
      'st-market-research',
      'st-launch-brief',
      'st-gate-strategy',
      'st-build-checklist',
      'st-copy-package',
      'st-landing-page-copy',
      'st-gate-copy',
      'st-ad-design',
      'st-image-brief',
      'st-generate-images',
      'st-funnel-design',
      'st-deck-bones',
      'st-gate-creative',
      'st-compile-ads',
      'st-media-plan',
      'st-gate-production',
    ])
    expect(plan.subtasks[0]?.assignTo).toBe('atlas')
    expect(plan.subtasks.find((s) => s.id === 'st-gate-precall')?.assignTo).toBe(
      `human:${base.mission.user_id}`,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-market-research')?.assignTo).toBe('ads_manager')
    expect(plan.subtasks.find((s) => s.id === 'st-market-research')?.dependsOn).toEqual([
      'st-strategy-v2',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-market-research')?.intent.ecology).toMatch(
      /actual failed tool attempt/i,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-launch-brief')?.dependsOn).toEqual([
      'st-market-research',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-launch-brief')?.intent.ecology).toMatch(
      /completed.*market research/i,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.assignTo).toBe('copywriter')
    expect(plan.subtasks.find((s) => s.id === 'st-build-checklist')?.assignTo).toBe('vibey')
    expect(plan.subtasks.find((s) => s.id === 'st-build-checklist')?.intent.ecology).toMatch(
      /publishToTaskList true/,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.dependsOn).toEqual([
      'st-build-checklist',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-funnel-design')?.assignTo).toBe('designer')
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.outputContract?.expected).toEqual(
      {
        title: 'WEB#5A - Copy Package',
      },
    )
    expect(
      plan.subtasks.find((s) => s.id === 'st-landing-page-copy')?.outputContract?.expected,
    ).toEqual({ title: 'WEB#5B - Landing Page Copy' })
    expect(plan.subtasks.find((s) => s.id === 'st-landing-page-copy')?.dependsOn).toEqual([
      'st-copy-package',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-gate-copy')?.dependsOn).toEqual([
      'st-landing-page-copy',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-ad-design')?.assignTo).toBe('designer')
    expect(plan.subtasks.find((s) => s.id === 'st-media-plan')?.assignTo).toBe('ads_manager')
    expect(
      plan.subtasks
        .filter((s) =>
          [
            'st-copy-package',
            'st-landing-page-copy',
            'st-ad-design',
            'st-image-brief',
            'st-generate-images',
            'st-funnel-design',
            'st-deck-bones',
            'st-compile-ads',
            'st-media-plan',
          ].includes(s.id),
        )
        .every((s) => s.publishToTaskList === true),
    ).toBe(true)
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
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.intent.ecology).toMatch(
      /zero em dashes/i,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.intent.ecology).toMatch(
      /continuous ad text/i,
    )
    expect(plan.subtasks.find((s) => s.id === 'st-copy-package')?.intent.ecology).toMatch(
      /Script, Shooting instructions, Overlays/i,
    )
  })

  it('runs the full pre-call-first flow when a legacy post_call start is supplied', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      mission: {
        ...base.mission,
        input: { playbook_kickoff: { start_at: 'post_call' } },
      },
    })
    expect(plan.subtasks.map((s) => s.id).slice(0, 6)).toEqual([
      'st-atlas-context',
      'st-precall',
      'st-gate-precall',
      'st-atlas-transcript',
      'st-strategy-v2',
      'st-market-research',
    ])
    expect(plan.subtasks.some((s) => s.id === 'st-copy-package')).toBe(true)
  })

  it('runs the full pre-call-first flow when a legacy launch_brief start is supplied', () => {
    const plan = expandWebinarFulfillmentPlaybook({
      ...base,
      mission: {
        ...base.mission,
        input: { playbook_kickoff: { start_at: 'launch_brief' } },
      },
    })
    expect(plan.subtasks.map((s) => s.id).slice(0, 6)).toEqual([
      'st-atlas-context',
      'st-precall',
      'st-gate-precall',
      'st-atlas-transcript',
      'st-strategy-v2',
      'st-market-research',
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
      'st-strategy-v2',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-gate-strategy')?.dependsOn).toEqual([
      'st-launch-brief',
    ])
    expect(plan.subtasks.find((s) => s.id === 'st-ad-design')?.dependsOn).toEqual(['st-gate-copy'])
    expect(plan.subtasks.find((s) => s.id === 'st-media-plan')?.dependsOn).toEqual([
      'st-compile-ads',
      'st-funnel-design',
      'st-deck-bones',
    ])
  })

  it('wires Gate 2 REVIEW MAP owners for surgical reject', () => {
    const plan = expandWebinarFulfillmentPlaybook(base)
    const gate2 = plan.subtasks.find((s) => s.id === 'st-gate-copy')
    expect(gate2?.intent.ecology).toContain('5A.3→roas-ad-copy')
    expect(gate2?.intent.ecology).toContain('5B→roas-landing-page-copy')
    expect(gate2?.intent.ecology).toContain('{{run.review_feedback}}')
  })

  it('keeps every generated intent field within the mission plan API contract', () => {
    const plan = expandWebinarFulfillmentPlaybook(base)

    for (const subtask of plan.subtasks) {
      for (const [field, value] of Object.entries(subtask.intent)) {
        expect(value.length, `${subtask.id}.intent.${field}`).toBeLessThanOrEqual(1000)
      }
    }
  })

  it('requires Dylan Super Voice exclusively for every agent-owned client-facing line', () => {
    const plan = expandWebinarFulfillmentPlaybook(base)
    const agentTasks = plan.subtasks.filter((subtask) => !subtask.assignTo.startsWith('human:'))

    expect(agentTasks).not.toHaveLength(0)
    for (const subtask of agentTasks) {
      expect(subtask.intent.ecology).toContain('CLIENT WRITING RULE')
      expect(subtask.intent.ecology).toContain('dylans-super-voice')
      expect(subtask.intent.ecology).toContain('only voice authority')
      expect(subtask.intent.ecology).toContain('human-written-copy')
      expect(subtask.intent.ecology).toContain('dylans-voice')
    }
  })

  it('requires qualifying image briefs and generated assets', () => {
    const plan = expandWebinarFulfillmentPlaybook(base)
    const briefs = plan.subtasks.find((subtask) => subtask.id === 'st-image-brief')
    const images = plan.subtasks.find((subtask) => subtask.id === 'st-generate-images')

    expect(briefs?.intent.ecology).toMatch(/Audience Lock/)
    expect(briefs?.intent.ecology).toMatch(/Offer Lock/)
    expect(briefs?.intent.ecology).toMatch(/two audience cues/i)
    expect(briefs?.intent.ecology).toMatch(/Two-Second Test/)
    expect(briefs?.intent.ecology).toMatch(/Theme lacks them, block/i)
    expect(images?.intent.ecology).toMatch(/approved asset reference/i)
    expect(images?.intent.ecology).toMatch(/do not redraw logos/i)
    expect(images?.intent.ecology).toMatch(/generic business metaphor/i)
    expect(images?.intent.ecology).toMatch(/Two-Second Test/)
  })
})
