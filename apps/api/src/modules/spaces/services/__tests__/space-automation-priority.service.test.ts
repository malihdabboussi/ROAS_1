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

describe('SpaceAutomationService priority automation slice', () => {
  it('matches priority_changed triggers and executes matching actions', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Priority changed',
              enabled: true,
              trigger: { type: 'priority_changed', to: 'high' },
              actions: [
                { type: 'add_comment', message_template: 'Priority is now {{item.priority}}' },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', priority: 'high', title: 'Task' }),
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

    await service.evaluate({ type: 'priority_changed', from: 'low', to: 'high' } as never, {
      supabase: supabaseWithRunLog() as never,
      userId: 'user_1',
      orgId: null,
      spaceId: 'space_1',
      itemId: 'item_1',
      depth: 0,
    })

    expect(repo.createActivity).toHaveBeenCalledTimes(2)
  })

  it('executes change_priority actions by updating the Space item priority', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Change priority',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [{ type: 'change_priority', priority: 'urgent' }],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', priority: 'low', title: 'Task' }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      updateItem: vi.fn().mockResolvedValue({ id: 'item_1', priority: 'urgent' }),
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
      { priority: 'urgent' },
      null,
    )
  })
})

describe('SpacesService priority automation emission', () => {
  it('emits priority_changed once when item priority changes', async () => {
    const repo = {
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', priority: 'low', status: 'todo' }),
      updateItem: vi.fn().mockResolvedValue({ id: 'item_1', priority: 'high', status: 'todo' }),
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
      { priority: 'high' },
      null,
    )

    expect(automation.evaluate).toHaveBeenCalledWith(
      { type: 'priority_changed', from: 'low', to: 'high', is_subtask: false },
      expect.objectContaining({ userId: 'user_1', spaceId: 'space_1', itemId: 'item_1' }),
    )
  })
})
