import { describe, expect, it } from 'vitest'
import { taskRollupToYourTurnItem } from './task-rollup-to-your-turn'
import type { TaskRollupItem } from './tasks-api'

const item: TaskRollupItem = {
  id: 'task-1',
  title: 'QA assignee',
  status: 'todo',
  due_at: '2026-08-31T16:59:00.000Z',
  assignee_user_id: 'user-1',
  assignees: [{ type: 'human', id: 'user-1' }],
  space_id: 'space-1',
  space_title: 'General',
  campaign_id: 'campaign-1',
  campaign_name: 'Test webinar',
  program_id: 'program-1',
  program_name: 'Clients',
  source_url: '/spaces?space=space-1&item=task-1',
  description: 'Check the assignee path',
  org_id: 'org-1',
  linked_mission_id: null,
  created_at: '2026-08-16T12:00:00.000Z',
  updated_at: '2026-08-16T13:00:00.000Z',
}

describe('taskRollupToYourTurnItem', () => {
  it('maps a rollup row onto a space-item Your Turn record', () => {
    expect(taskRollupToYourTurnItem(item)).toEqual({
      kind: 'space_item',
      id: 'task-1',
      title: 'QA assignee',
      status: 'todo',
      assignee_user_id: 'user-1',
      org_id: 'org-1',
      mission_id: null,
      space_id: 'space-1',
      suggestion_state: null,
      due_at: '2026-08-31T16:59:00.000Z',
      source_url: '/spaces?space=space-1&item=task-1',
      preview: 'Check the assignee path',
      created_at: '2026-08-16T12:00:00.000Z',
      updated_at: '2026-08-16T13:00:00.000Z',
    })
  })
})
