import { describe, expect, it } from 'vitest'
import { buildTaskCleanupMissionPayload, TASK_CLEANUP_PLAYBOOK_ID } from './task-cleanup'

describe('buildTaskCleanupMissionPayload', () => {
  it('starts the task cleanup playbook with a call window', () => {
    const payload = buildTaskCleanupMissionPayload({
      window: 'last_7d',
      client_context: 'Yasir',
      notes: 'Include the Monday huddle',
    })

    expect(payload.title).toBe('Task Cleanup')
    expect(payload.input.playbook_id).toBe(TASK_CLEANUP_PLAYBOOK_ID)
    expect(payload.brief).toContain('the last 7 days')
    expect(payload.input.playbook_kickoff).toEqual({
      window: 'last_7d',
      client_context: 'Yasir',
      notes: 'Include the Monday huddle',
    })
  })
})
