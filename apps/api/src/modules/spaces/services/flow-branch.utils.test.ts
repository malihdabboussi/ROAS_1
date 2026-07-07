import { describe, expect, it } from 'vitest'
import {
  evaluateFlowBranchCondition,
  readFlowBranchFieldValue,
  resolveFlowBranchJumpIndex,
} from './flow-branch.utils'

describe('flow-branch.utils', () => {
  it('reads top-level and custom field values', () => {
    expect(
      readFlowBranchFieldValue(
        { status: 'done', custom_data: { region: 'US' } },
        'status',
      ),
    ).toBe('done')
    expect(
      readFlowBranchFieldValue(
        { status: 'done', custom_data: { region: 'US' } },
        'region',
      ),
    ).toBe('US')
  })

  it('evaluates branch operators', () => {
    expect(evaluateFlowBranchCondition('Done', 'equals', 'done')).toBe(true)
    expect(evaluateFlowBranchCondition('todo', 'not_equals', 'done')).toBe(true)
    expect(evaluateFlowBranchCondition('hello world', 'contains', 'WORLD')).toBe(true)
    expect(evaluateFlowBranchCondition('', 'is_empty', '')).toBe(true)
    expect(evaluateFlowBranchCondition('x', 'is_not_empty', '')).toBe(true)
  })

  it('resolves then/else jump targets', () => {
    expect(
      resolveFlowBranchJumpIndex({
        matched: true,
        thenStepIndex: 1,
        elseStepIndex: 3,
      }),
    ).toBe(1)
    expect(
      resolveFlowBranchJumpIndex({
        matched: false,
        thenStepIndex: 1,
        elseStepIndex: 3,
      }),
    ).toBe(3)
    expect(
      resolveFlowBranchJumpIndex({
        matched: false,
        thenStepIndex: 1,
      }),
    ).toBeNull()
  })
})
