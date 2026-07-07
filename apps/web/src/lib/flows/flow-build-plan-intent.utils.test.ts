import { describe, expect, it } from 'vitest'
import {
  isFlowBuildPlanIntentOverloaded,
  normalizeFlowBuildPlanIntentForDisplay,
  planMissingStructuredSteps,
} from './flow-build-plan-intent.utils'

describe('flow-build-plan-intent.utils', () => {
  it('inserts paragraph breaks before inline Step headings', () => {
    expect(
      normalizeFlowBuildPlanIntentForDisplay(
        'Overview text. Step 1: Do research. Step 2: Draft summary.',
      ),
    ).toBe('Overview text.\n\nStep 1: Do research.\n\nStep 2: Draft summary.')
  })

  it('detects overloaded intent text', () => {
    expect(isFlowBuildPlanIntentOverloaded('Step 1: Research competitors.')).toBe(true)
    expect(isFlowBuildPlanIntentOverloaded('When a task is done, notify the owner.')).toBe(false)
  })

  it('detects plans without structured steps', () => {
    expect(planMissingStructuredSteps({ trigger: null, actions: [] })).toBe(true)
    expect(planMissingStructuredSteps({ trigger: { id: 'trigger-1' }, actions: [] })).toBe(false)
  })
})
