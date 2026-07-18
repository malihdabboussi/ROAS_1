import { describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '../types'
import { syncLinkedMissionStepForTaskStatus } from './linked-mission-task-status'

const linkedTask = {
  linked_mission_id: 'mission-1',
  linked_mission_subtask_id: 'step-1',
} as SpaceItem

describe('syncLinkedMissionStepForTaskStatus', () => {
  it('completes the exact linked human Mission step', async () => {
    const complete = vi.fn().mockResolvedValue({ ok: true, deliverable_id: null })

    await expect(
      syncLinkedMissionStepForTaskStatus(
        { ...linkedTask, assignee_type: 'human' },
        'done',
        complete,
      ),
    ).resolves.toBe('human_completed')
    expect(complete).toHaveBeenCalledWith(
      'mission-1',
      'step-1',
      'Completed from the linked Space Task.',
    )
  })

  it('keeps linked agent task status controlled by the Mission step', async () => {
    const complete = vi.fn()

    await expect(
      syncLinkedMissionStepForTaskStatus(
        { ...linkedTask, assignee_type: 'agent' },
        'done',
        complete,
      ),
    ).resolves.toBe('agent_managed')
    expect(complete).not.toHaveBeenCalled()
  })
})
