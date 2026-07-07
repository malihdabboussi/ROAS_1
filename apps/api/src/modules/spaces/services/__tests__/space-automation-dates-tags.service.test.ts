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

describe('SpaceAutomationService date and tag automation matching', () => {
  it('matches due_date_changed when from/to filters are unset', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Due date changed',
              enabled: true,
              trigger: { type: 'due_date_changed' },
              actions: [{ type: 'add_comment', message_template: 'Due date moved' }],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Task' }),
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
        type: 'due_date_changed',
        from: '2026-05-01T00:00:00Z',
        to: '2026-05-12T00:00:00Z',
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

  it('matches tag_added only when tag matches', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Tag added vip',
              enabled: true,
              trigger: { type: 'tag_added', tag: 'vip' },
              actions: [{ type: 'add_comment', message_template: 'Tagged VIP' }],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Task' }),
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

    await service.evaluate({ type: 'tag_added', tag: 'vip' } as never, {
      supabase: supabaseWithRunLog() as never,
      userId: 'user_1',
      orgId: null,
      spaceId: 'space_1',
      itemId: 'item_1',
      depth: 0,
    })
    expect(repo.createActivity).toHaveBeenCalledTimes(2)

    repo.createActivity.mockClear()
    await service.evaluate({ type: 'tag_added', tag: 'lead' } as never, {
      supabase: supabaseWithRunLog() as never,
      userId: 'user_1',
      orgId: null,
      spaceId: 'space_1',
      itemId: 'item_1',
      depth: 0,
    })
    expect(repo.createActivity).not.toHaveBeenCalled()
  })
})

describe('SpacesService date and tag automation emission', () => {
  it('emits due_date_changed once when due_date changes', async () => {
    const oldItem = {
      id: 'item_1',
      due_date: '2026-05-01T00:00:00Z',
      parent_item_id: null,
      custom_data: {},
    }
    const repo = {
      findItemById: vi.fn().mockResolvedValue(oldItem),
      updateItem: vi.fn().mockResolvedValue({ ...oldItem, due_date: '2026-05-12T00:00:00Z' }),
      createActivities: vi.fn().mockResolvedValue(undefined),
    }
    const automation = { evaluate: vi.fn().mockResolvedValue(undefined) }
    const permissions = { assertCanAccessItem: vi.fn().mockResolvedValue('edit') }
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
      { due_date: '2026-05-12T00:00:00Z' } as never,
      null,
    )

    const dateCalls = automation.evaluate.mock.calls.filter(
      (c: unknown[]) =>
        typeof c[0] === 'object' &&
        c[0] !== null &&
        (c[0] as { type?: string }).type === 'due_date_changed',
    )
    expect(dateCalls).toHaveLength(1)
    expect(dateCalls[0][0]).toMatchObject({
      type: 'due_date_changed',
      from: '2026-05-01T00:00:00Z',
      to: '2026-05-12T00:00:00Z',
      is_subtask: false,
    })
  })

  it('emits tag_added/tag_removed and skips field_changed for tags', async () => {
    const oldItem = {
      id: 'item_1',
      parent_item_id: null,
      custom_data: { tags: ['existing'] },
    }
    const repo = {
      findItemById: vi.fn().mockResolvedValue(oldItem),
      updateItem: vi.fn().mockResolvedValue({
        ...oldItem,
        custom_data: { tags: ['existing', 'vip'] },
      }),
      createActivities: vi.fn().mockResolvedValue(undefined),
    }
    const automation = { evaluate: vi.fn().mockResolvedValue(undefined) }
    const permissions = { assertCanAccessItem: vi.fn().mockResolvedValue('edit') }
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
      { custom_data: { tags: ['existing', 'vip'] } } as never,
      null,
    )

    const events = automation.evaluate.mock.calls.map((c: unknown[]) => c[0]) as Array<{
      type: string
      tag?: string
      field_id?: string
    }>
    const added = events.filter((e) => e.type === 'tag_added')
    const fieldChanged = events.filter((e) => e.type === 'field_changed' && e.field_id === 'tags')
    expect(added).toEqual([
      expect.objectContaining({ type: 'tag_added', tag: 'vip', is_subtask: false }),
    ])
    expect(fieldChanged).toHaveLength(0)
  })
})
