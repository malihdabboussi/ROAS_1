import { describe, expect, it, vi } from 'vitest'
import { SpacesService } from '../spaces.service'
import { SpaceAutomationService } from '../space-automation.service'
import { automationsRepoFromRepo } from './space-automation-test-utils'

function supabaseWithRunLog() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'space_automation_runs') return { insert: vi.fn().mockResolvedValue({}) }
      return {}
    }),
  }
}

function spaceRetrievalIndexMock() {
  return {
    indexSource: vi.fn().mockResolvedValue(undefined),
    deleteSource: vi.fn().mockResolvedValue(undefined),
  }
}

function notificationsMock() {
  return { dispatch: vi.fn() }
}

describe('SpaceAutomationService assignee automation slice', () => {
  it('matches assignee_changed triggers and executes matching actions', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Assignee changed',
              enabled: true,
              trigger: { type: 'assignee_changed', assignee_type: 'agent' },
              actions: [{ type: 'add_comment', message_template: 'Assigned to {{task.assignee}}' }],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({
        id: 'item_1',
        assignee_type: 'agent',
        assignee_id: 'agent_atlas',
        title: 'Task',
      }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      createActivity: vi.fn().mockResolvedValue({}),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    await service.evaluate(
      {
        type: 'assignee_changed',
        from_type: 'human',
        from_id: 'user_1',
        to_type: 'agent',
        to_id: 'agent_atlas',
      } as never,
      {
        supabase: supabaseWithRunLog() as never,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'item_1',
        depth: 0,
      },
    )

    expect(repo.createActivity).toHaveBeenCalledTimes(2)
  })

  it('executes assign_to actions by updating the Space item assignee', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Assign task',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'assign_to',
                  assignees: [
                    { type: 'agent', id: 'agent_atlas' },
                    { type: 'human', id: 'user_3' },
                  ],
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi
        .fn()
        .mockResolvedValueOnce({ id: 'item_1', assignee_type: 'human', assignee_id: 'user_2' })
        .mockResolvedValue({
          id: 'item_1',
          assignee_type: 'agent',
          assignee_id: 'agent_atlas',
          assignees: [
            { type: 'agent', id: 'agent_atlas' },
            { type: 'human', id: 'user_3' },
          ],
        }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      updateItem: vi.fn().mockResolvedValue({
        id: 'item_1',
        assignee_type: 'agent',
        assignee_id: 'agent_atlas',
      }),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    await service.evaluate(
      { type: 'task_created', in_status: 'todo' },
      {
        supabase: supabaseWithRunLog() as never,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'item_1',
        depth: 0,
      },
    )

    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      'item_1',
      {
        assignees: [
          { type: 'agent', id: 'agent_atlas' },
        ],
        assignee_type: 'agent',
        assignee_id: 'agent_atlas',
      },
      null,
    )
  })
})

describe('SpacesService assignee automation emission', () => {
  it('emits assignee_changed once when item assignee changes', async () => {
    const repo = {
      findItemById: vi.fn().mockResolvedValue({
        id: 'item_1',
        assignee_type: 'human',
        assignee_id: 'user_2',
        status: 'todo',
      }),
      updateItem: vi.fn().mockResolvedValue({
        id: 'item_1',
        assignee_type: 'agent',
        assignee_id: 'agent_atlas',
        status: 'todo',
      }),
      createActivities: vi.fn().mockResolvedValue(undefined),
    }
    const permissions = { assertCanAccessItem: vi.fn().mockResolvedValue('edit') }
    const automation = { evaluate: vi.fn().mockResolvedValue(undefined) }
    const service = new SpacesService(
      repo as never,
      permissions as never,
      automation as never,
      {} as never,
      {} as never,
      {} as never,
      notificationsMock() as never,
      spaceRetrievalIndexMock() as never,
    )

    await service.updateItem(
      supabaseWithRunLog() as never,
      'user_1',
      'space_1',
      'item_1',
      { assignee_type: 'agent', assignee_id: 'agent_atlas' },
      null,
    )

    expect(automation.evaluate).toHaveBeenCalledWith(
      {
        type: 'assignee_changed',
        from_type: 'human',
        from_id: 'user_2',
        to_type: 'agent',
        to_id: 'agent_atlas',
        from_assignees: [{ type: 'human', id: 'user_2' }],
        to_assignees: [{ type: 'agent', id: 'agent_atlas' }],
        added_assignees: [{ type: 'agent', id: 'agent_atlas' }],
        removed_assignees: [{ type: 'human', id: 'user_2' }],
        is_subtask: false,
      },
      expect.objectContaining({ userId: 'user_1', spaceId: 'space_1', itemId: 'item_1' }),
    )
  })
})
