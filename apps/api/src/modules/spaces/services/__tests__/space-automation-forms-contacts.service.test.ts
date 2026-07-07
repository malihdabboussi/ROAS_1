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

function chain(result: unknown) {
  const api: Record<string, unknown> = {
    select: () => api,
    eq: () => api,
    single: async () => result,
    maybeSingle: async () => result,
    update: () => api,
    insert: () => api,
  }
  return api
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

describe('SpacesService form automation emission', () => {
  it('emits task_created and form_submitted when a form creates a Space item', async () => {
    const repo = {
      maxSortOrderForParent: vi.fn().mockResolvedValue(0),
      createItem: vi.fn().mockResolvedValue({
        id: 'item_1',
        status: 'todo',
        form_id: 'form_1',
        custom_data: { email: 'lead@example.com', _source: 'form' },
      }),
      createActivities: vi.fn().mockResolvedValue(undefined),
    }
    const permissions = { assertCanAccessSpace: vi.fn().mockResolvedValue('edit') }
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

    await service.createItem(
      supabaseWithRunLog() as never,
      'user_1',
      'space_1',
      {
        title: 'Form submission',
        form_id: 'form_1',
        custom_data: { email: 'lead@example.com', _source: 'form' },
      },
      null,
    )

    expect(automation.evaluate).toHaveBeenCalledWith(
      { type: 'task_created', in_status: 'todo', is_subtask: false },
      expect.objectContaining({ itemId: 'item_1', spaceId: 'space_1' }),
    )
    expect(automation.evaluate).toHaveBeenCalledWith(
      {
        type: 'form_submitted',
        form_id: 'form_1',
        answers: { email: 'lead@example.com', _source: 'form' },
      },
      expect.objectContaining({ itemId: 'item_1', spaceId: 'space_1' }),
    )
  })
})

describe('SpaceAutomationService form and contact automation', () => {
  it('matches form_submitted by form_id', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Form submitted',
              enabled: true,
              trigger: { type: 'form_submitted', form_id: 'form_1' },
              actions: [{ type: 'add_comment', message_template: 'New form: {{task.title}}' }],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Form submission' }),
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
        type: 'form_submitted',
        form_id: 'form_1',
        answers: { email: 'lead@example.com' },
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

  it('routes contact tag events into the matching Space automation', async () => {
    const createdItem = { id: 'item_1', title: 'Contact tag added: vip' }
    const route = {
      id: 'route_1',
      space_id: 'space_1',
      automation_id: 'automation_1',
      user_id: 'user_1',
      org_id: null,
      trigger_type: 'contact_tag_added',
      filters: { tag: 'vip' },
    }
    const repo = {
      createItem: vi.fn().mockResolvedValue(createdItem),
      createActivity: vi.fn().mockResolvedValue({}),
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Contact tag',
              enabled: true,
              trigger: { type: 'contact_tag_added', tag: 'vip' },
              actions: [],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue(createdItem),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_contact_automation_routes') {
          const result = { data: [route], error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
          builder.is = () => builder
          builder.then = (resolve: (value: typeof result) => unknown) => resolve(result)
          return builder
        }
        if (table === 'space_automation_runs') return { insert: async () => ({ error: null }) }
        return chain({ data: null, error: null })
      }),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    const result = await service.processContactAutomationEvent(
      supabase as never,
      {
        type: 'contact_tag_added',
        contact_id: 'contact_1',
        user_id: 'user_1',
        org_id: null,
        tag: 'vip',
      } as never,
    )

    expect(result).toEqual({ processed: true, routes: 1 })
    expect(repo.createItem).toHaveBeenCalledOnce()
  })

  it('adds and removes contact tags idempotently', async () => {
    const contactRows = [
      { id: 'contact_1', tags: ['existing'], email: 'lead@example.com' },
      { id: 'contact_1', tags: ['existing', 'vip'], email: 'lead@example.com' },
    ]
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: contactRows[0], error: null })
      .mockResolvedValueOnce({ data: contactRows[1], error: null })
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Contact tags',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                { type: 'add_contact_tag', contact_id: 'contact_1', tag: 'vip' },
                { type: 'remove_contact_tag', contact_id: 'contact_1', tag: 'existing' },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Task', custom_data: {} }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'contacts') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle,
              }),
            }),
            update,
          }
        }
        if (table === 'space_automation_runs') return { insert: vi.fn().mockResolvedValue({}) }
        return {}
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
        supabase: supabase as never,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'item_1',
        depth: 0,
      },
    )

    expect(update).toHaveBeenCalledWith({ tags: ['existing', 'vip'] })
    expect(update).toHaveBeenCalledWith({ tags: ['vip'] })
  })
})
