import { describe, expect, it, vi } from 'vitest'
import { SpacesService } from '../spaces.service'

function spaceRetrievalIndexMock() {
  return {
    indexSource: vi.fn().mockResolvedValue(undefined),
    deleteSource: vi.fn().mockResolvedValue(undefined),
  }
}

function notificationsMock() {
  return { dispatch: vi.fn() }
}

function supabaseForDuplicate() {
  return {
    client: {
      from: vi.fn(),
    },
  }
}

describe('SpacesService duplicateItem', () => {
  it('duplicates an item and included subtasks with rewritten ownership', async () => {
    const created = {
      id: 'copy-1',
      title: 'Launch task (copy)',
      status: 'todo',
      parent_item_id: null,
    }
    const supabase = supabaseForDuplicate()
    const inserts: unknown[] = []
    const repo = {
      findItemById: vi.fn().mockResolvedValue({
        id: 'item-1',
        title: 'Launch task',
        status: 'todo',
        priority: 'high',
        assignees: [{ type: 'agent', id: 'agent_atlas' }],
        custom_data: { campaign: 'launch' },
      }),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      findSubtasksByParentId: vi.fn().mockResolvedValue([
        {
          id: 'sub-1',
          title: 'Child task',
          status: 'in_progress',
          parent_item_id: 'item-1',
          custom_data: { child: true },
        },
      ]),
      createActivities: vi.fn().mockResolvedValue(undefined),
      createPreparedItem: vi.fn(async (_supabase: unknown, payload: unknown) => {
        inserts.push(payload)
        return created
      }),
      createPreparedItems: vi.fn(async (_supabase: unknown, payloads: unknown[]) => {
        inserts.push(payloads)
      }),
    }
    const service = new SpacesService(
      repo as never,
      { assertCanAccessItem: vi.fn().mockResolvedValue('edit') } as never,
      { evaluate: vi.fn().mockResolvedValue(undefined) } as never,
      {} as never,
      {} as never,
      {} as never,
      notificationsMock() as never,
      spaceRetrievalIndexMock() as never,
    )

    const result = await service.duplicateItem(
      supabase.client as never,
      'user-1',
      'space-1',
      'item-1',
      {
        include: {
          status: true,
          priority: true,
          assignees: true,
          subtasks: true,
          custom_field_ids: ['campaign'],
        },
      },
      'org-1',
    )

    expect(result).toEqual(created)
    expect(inserts).toEqual([
      expect.objectContaining({
        title: 'Launch task (copy)',
        space_id: 'space-1',
        user_id: 'user-1',
        org_id: 'org-1',
        parent_item_id: null,
        status: 'todo',
        priority: 'high',
        assignees: [{ type: 'agent', id: 'agent_atlas' }],
        custom_data: { campaign: 'launch' },
      }),
      [
        expect.objectContaining({
          title: 'Child task',
          space_id: 'space-1',
          user_id: 'user-1',
          org_id: 'org-1',
          parent_item_id: 'copy-1',
          status: 'in_progress',
          priority: undefined,
          custom_data: {},
        }),
      ],
    ])
    expect(repo.createActivities).toHaveBeenCalledWith(
      supabase.client,
      expect.arrayContaining([
        expect.objectContaining({
          item_id: 'copy-1',
          event_type: 'created',
          payload: { title: 'Launch task (copy)', duplicated_from_item_id: 'item-1' },
        }),
      ]),
    )
    expect(supabase.client.from).not.toHaveBeenCalled()
  })
})
