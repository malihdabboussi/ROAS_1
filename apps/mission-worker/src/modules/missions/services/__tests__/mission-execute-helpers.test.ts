import { describe, expect, it } from 'vitest'
import { resolveMissionStatusWhileSubtaskRuns } from '../phases/mission-execute-helpers'

describe('resolveMissionStatusWhileSubtaskRuns', () => {
  it('preserves access-needed aggregate state for an independent running branch', () => {
    expect(resolveMissionStatusWhileSubtaskRuns('awaiting_access_approval')).toBe(
      'awaiting_access_approval',
    )
  })
  it('marks ordinary runnable missions in progress', () => {
    expect(resolveMissionStatusWhileSubtaskRuns('todo')).toBe('in_progress')
  })
})
