import { describe, expect, it } from 'vitest'
import {
  buildFlowBuilderActionStepOptions,
  buildFlowBuilderPriorActionStepOptions,
  flowBuilderActionIndexToStepNumber,
  flowBuilderStepNumberToActionIndex,
} from './flow-builder-step-index.utils'

describe('flow-builder-step-index.utils', () => {
  it('maps action indices to canvas step numbers', () => {
    expect(flowBuilderActionIndexToStepNumber(0)).toBe(2)
    expect(flowBuilderActionIndexToStepNumber(1)).toBe(3)
    expect(flowBuilderStepNumberToActionIndex(2)).toBe(0)
    expect(flowBuilderStepNumberToActionIndex(1)).toBeNull()
  })

  it('builds prior and full step option labels', () => {
    const actions = [
      { type: 'add_comment' as const, message_template: '' },
      {
        type: 'flow_loop' as const,
        target_step_index: 0,
        when: 'on_reject' as const,
        max_iterations: 3,
      },
      { type: 'change_status' as const, status: 'done' },
    ]

    expect(buildFlowBuilderPriorActionStepOptions(actions, 2)).toEqual([
      { value: '0', label: 'Step 2: add comment' },
      { value: '1', label: 'Step 3: flow loop' },
    ])
    expect(buildFlowBuilderActionStepOptions(actions)).toHaveLength(3)
  })
})
