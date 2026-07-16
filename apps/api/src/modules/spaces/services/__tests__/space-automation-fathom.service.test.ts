import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { automationsRepoFromRepo } from './space-automation-test-utils'
import { chain } from './space-automation-fathom-test-helpers'

describe('SpaceAutomationService Fathom recording fanout', () => {
  it('creates one Space item and runs matching automation for a Fathom recording webhook', async () => {
    const createdItem = { id: 'item_1', title: 'Demo call' }
    const route = {
      id: 'route_1',
      space_id: 'space_1',
      automation_id: 'automation_1',
      user_id: 'user_1',
      org_id: null,
      filters: { title_contains: 'Demo' },
    }
    const repo = {
      createItem: vi.fn().mockResolvedValue(createdItem),
      updateItem: vi.fn().mockResolvedValue(createdItem),
      createActivity: vi.fn().mockResolvedValue({}),
      findSpaceById: vi.fn().mockResolvedValue({
        id: 'space_1',
        schema: {
          fields: [{ id: 'attendees', type: 'multi_select', options: [] }],
          automations: [
            {
              id: 'automation_1',
              name: 'Fathom automation',
              enabled: true,
              trigger: {
                type: 'external_fathom_recording_ready',
                title_contains: 'Demo',
              },
              actions: [],
            },
          ],
        },
      }),
      updateSpace: vi.fn().mockResolvedValue({}),
      findItemById: vi.fn().mockResolvedValue(createdItem),
      findItemByFathomMeetingId: vi.fn().mockResolvedValue(null),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_external_automation_events') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'event_row_1' }, error: null }),
              }),
            }),
            update: () => ({ eq: async () => ({ error: null }) }),
          }
        }
        if (table === 'space_external_automation_triggers') {
          const result = { data: [route], error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
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

    const result = await service.processFathomRecordingEvent(supabase as never, 'user_1', {
      id: 'rec_1',
      title: 'Demo call',
      transcript: [{ speaker: { display_name: 'Yosef' }, text: 'Hello', timestamp: '00:00' }],
      default_summary: { markdown_formatted: 'Summary' },
    })

    expect(result).toEqual({
      processed: true,
      fanout_count: 1,
      item_id: 'item_1',
      automation_id: 'automation_1',
    })
    expect(repo.createItem).toHaveBeenCalledOnce()
    expect(repo.createItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      expect.objectContaining({ title: 'Demo call' }),
      null,
    )
    expect(repo.createActivity).toHaveBeenCalledOnce()
  })

  it('fans out a single Fathom recording across every matching rule the user owns', async () => {
    const itemA = { id: 'item_a', title: 'Demo call' }
    const itemB = { id: 'item_b', title: 'Demo call' }
    const routeA = {
      id: 'route_a',
      space_id: 'space_a',
      automation_id: 'automation_a',
      user_id: 'user_1',
      org_id: null,
      filters: { title_contains: 'Demo' },
    }
    const routeB = {
      id: 'route_b',
      space_id: 'space_b',
      automation_id: 'automation_b',
      user_id: 'user_1',
      org_id: null,
      filters: {},
    }
    const createItem = vi.fn().mockResolvedValueOnce(itemA).mockResolvedValueOnce(itemB)
    const repo = {
      createItem,
      updateItem: vi.fn().mockImplementation(async (_s, _u, _space, itemId) =>
        itemId === 'item_a' ? itemA : itemB,
      ),
      createActivity: vi.fn().mockResolvedValue({}),
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          fields: [{ id: 'attendees', type: 'multi_select', options: [] }],
          automations: [
            {
              id: 'automation_a',
              name: 'A',
              enabled: true,
              trigger: { type: 'external_fathom_recording_ready' },
              actions: [],
            },
            {
              id: 'automation_b',
              name: 'B',
              enabled: true,
              trigger: { type: 'external_fathom_recording_ready' },
              actions: [],
            },
          ],
        },
      }),
      updateSpace: vi.fn().mockResolvedValue({}),
      findItemById: vi.fn().mockResolvedValue(itemA),
      findItemByFathomMeetingId: vi.fn().mockResolvedValue(null),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_external_automation_events') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'event_row_2' }, error: null }),
              }),
            }),
            update: () => ({ eq: async () => ({ error: null }) }),
          }
        }
        if (table === 'space_external_automation_triggers') {
          const result = { data: [routeA, routeB], error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
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

    const result = await service.processFathomRecordingEvent(supabase as never, 'user_1', {
      id: 'rec_2',
      title: 'Demo call',
    })

    expect(result).toEqual({
      processed: true,
      fanout_count: 2,
      item_id: 'item_a',
      automation_id: 'automation_a',
    })
    expect(repo.createItem).toHaveBeenCalledTimes(2)
    expect(repo.createActivity).toHaveBeenCalledTimes(2)
  })
})
