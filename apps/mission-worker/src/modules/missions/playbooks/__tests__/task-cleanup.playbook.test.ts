import { describe, expect, it } from 'vitest'
import { expandMissionPlaybook } from '../mission-playbook.registry'
import {
  expandTaskCleanupPlaybook,
  TASK_CLEANUP_BOARD_TITLE,
  TASK_CLEANUP_GATE_TITLE,
  TASK_CLEANUP_PLAYBOOK_ID,
} from '../task-cleanup.playbook'

describe('task-cleanup playbook', () => {
  it('gathers calls, writes a board, waits for approve, then files native tasks', () => {
    const plan = expandTaskCleanupPlaybook({
      playbookId: TASK_CLEANUP_PLAYBOOK_ID,
      mission: {
        id: 'mission-1',
        title: 'Task Cleanup',
        user_id: 'user-1',
        input: { playbook_kickoff: { window: 'this_week', notes: 'Include Slack huddles' } },
      },
      workerAgentKeys: ['atlas', 'reed'],
      managerKey: 'vibey',
    })

    expect(plan.title).toBe('Task Cleanup')
    expect(plan.subtasks.map((task) => task.id)).toEqual([
      'st-atlas-calls-tasks',
      'st-cleanup-board',
      'st-gate-cleanup',
      'st-file-tasks',
    ])
    expect(plan.subtasks[1]?.outputContract?.expected).toEqual({ title: TASK_CLEANUP_BOARD_TITLE })
    expect(plan.subtasks[2]?.title).toBe(TASK_CLEANUP_GATE_TITLE)
    expect(plan.subtasks[2]?.assignTo).toBe('human:user-1')
    expect(plan.subtasks[3]?.dependsOn).toEqual(['st-gate-cleanup'])
    expect(plan.subtasks[1]?.intent.ecology).toContain('Do not call create_task')
    expect(plan.subtasks[3]?.intent.ecology).toContain('create_task')
    expect(plan.subtasks[0]?.intent.ecology).toContain('list_meetings')
    expect(plan.subtasks[0]?.intent.ecology).toContain('list_tasks')
  })

  it('registers through the mission playbook expander', () => {
    const plan = expandMissionPlaybook({
      playbookId: TASK_CLEANUP_PLAYBOOK_ID,
      mission: {
        id: 'mission-3',
        title: 'Task Cleanup',
        user_id: 'user-1',
        input: {},
      },
      workerAgentKeys: ['atlas'],
      managerKey: 'vibey',
    })
    expect(plan?.title).toBe('Task Cleanup')
    expect(plan?.subtasks[2]?.assignTo).toBe('human:user-1')
  })

  it('skips the human gate when the mission has no owner id', () => {
    const plan = expandTaskCleanupPlaybook({
      playbookId: TASK_CLEANUP_PLAYBOOK_ID,
      mission: {
        id: 'mission-2',
        title: 'Task Cleanup',
        user_id: '',
        input: { playbook_kickoff: { window: 'today' } },
      },
      workerAgentKeys: ['atlas'],
      managerKey: 'vibey',
    })
    expect(plan.subtasks.map((task) => task.id)).toEqual([
      'st-atlas-calls-tasks',
      'st-cleanup-board',
      'st-file-tasks',
    ])
    expect(plan.subtasks[0]?.intent.ecology).toContain('today')
  })
})
