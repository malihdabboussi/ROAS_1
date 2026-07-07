import { describe, expect, it } from 'vitest'
import {
  applyTriggerContextSpaceId,
  readTriggerContextSpaceId,
  resolveTriggerContextSpaceId,
  triggerContextSpaceSetupRequired,
} from './flow-trigger-context-space.utils'

describe('flow-trigger-context-space.utils', () => {
  it('requires context space in concept sandbox for task triggers', () => {
    expect(
      triggerContextSpaceSetupRequired({
        trigger: { type: 'task_created' },
        flowSpaceIsConceptSandbox: true,
      }),
    ).toBe(true)
    expect(
      triggerContextSpaceSetupRequired({
        trigger: { type: 'task_created', context_space_id: 'space-1' },
        flowSpaceIsConceptSandbox: true,
      }),
    ).toBe(false)
  })

  it('resolves flow home space when not in concept sandbox', () => {
    expect(
      resolveTriggerContextSpaceId({
        trigger: { type: 'status_change', to: 'done' },
        flowSpaceId: 'home-space',
        flowSpaceIsConceptSandbox: false,
      }),
    ).toBe('home-space')
  })

  it('clears schema-bound fields when context space changes', () => {
    const next = applyTriggerContextSpaceId(
      { type: 'status_change', to: 'research', from: 'todo', context_space_id: 'space-a' },
      'space-b',
    )
    expect(readTriggerContextSpaceId(next)).toBe('space-b')
    expect(next.type === 'status_change' && next.from).toBeUndefined()
    expect(next.type === 'status_change' && next.to).toBe('')
  })
})
