import { describe, expect, it } from 'vitest'
import { TaskAgentCancelRegistry } from './task-agent-cancel-registry.service'

describe('TaskAgentCancelRegistry', () => {
  it('aborts the active task run and clears it on unregister', () => {
    const registry = new TaskAgentCancelRegistry()
    const controller = new AbortController()
    const unregister = registry.register({
      spaceId: 'space-1',
      itemId: 'item-1',
      activityId: 'activity-1',
      controller,
    })

    expect(registry.cancel('space-1', 'item-1')).toEqual({
      cancelled: true,
      activityId: 'activity-1',
    })
    expect(controller.signal.aborted).toBe(true)
    expect(registry.isCancelled('space-1', 'item-1', 'activity-1')).toBe(true)

    unregister()

    expect(registry.cancel('space-1', 'item-1')).toEqual({ cancelled: false })
  })
})
