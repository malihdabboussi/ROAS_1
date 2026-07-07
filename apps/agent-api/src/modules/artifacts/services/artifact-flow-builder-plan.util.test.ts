import { describe, expect, it } from 'vitest'
import { planFromData, validatePlanIntentStructure } from './artifact-flow-builder-plan.util'

describe('artifact-flow-builder-plan.util intent structure', () => {
  it('flags narrative-only plans without trigger/actions', () => {
    const plan = planFromData(
      {
        name: 'Strategic Research Workflow',
      },
      'Step 1: Research competitors. Step 2: Draft summary.',
    )

    expect(plan.trigger).toBeNull()
    expect(plan.actions).toEqual([])
    expect(plan.validation_errors).toContain(
      'Plan must include trigger and actions. Put step-by-step workflow detail in trigger/actions, not in intent.',
    )
    expect(plan.validation_errors).toContain(
      'intent contains step-by-step workflow text. Move Step headings into trigger/actions instead of intent.',
    )
  })

  it('accepts short intent when trigger/actions are present', () => {
    const plan = planFromData(
      {
        name: 'Done task follow-up',
        trigger: { type: 'status_change', to: 'done' },
        actions: [{ type: 'add_comment', message_template: 'Summary: {{summary}}' }],
      },
      'When a task moves to Done, summarize the outcome and create follow-up work when no next step exists.',
    )

    expect(validatePlanIntentStructure(plan)).toEqual([])
    expect(plan.validation_errors).toEqual([])
  })
})
