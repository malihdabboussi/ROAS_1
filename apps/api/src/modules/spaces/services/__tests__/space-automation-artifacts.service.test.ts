import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { automationsRepoFromRepo } from './space-automation-test-utils'

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

function supabaseWithRunLog() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'space_automation_runs') return { insert: vi.fn().mockResolvedValue({}) }
      return {}
    }),
  }
}

describe('SpaceAutomationService artifact automation', () => {
  it('routes a presentation_published event to matching campaign Spaces only', async () => {
    const createdItem = { id: 'item_1', title: 'Presentation published: Demo Deck' }
    const repo = {
      findSpacesByCampaignForOwner: vi.fn().mockResolvedValue([
        {
          id: 'space_1',
          schema: {
            automations: [
              {
                id: 'automation_1',
                name: 'Presentation published',
                enabled: true,
                trigger: {
                  type: 'artifact_lifecycle',
                  artifact_kind: 'presentation',
                  lifecycle_event: 'published',
                },
                actions: [],
              },
            ],
          },
        },
      ]),
      createItem: vi.fn().mockResolvedValue(createdItem),
      createActivity: vi.fn().mockResolvedValue({}),
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Presentation published',
              enabled: true,
              trigger: {
                type: 'artifact_lifecycle',
                artifact_kind: 'presentation',
                lifecycle_event: 'published',
              },
              actions: [],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue(createdItem),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )
    const supabase = supabaseWithRunLog() as never

    const result = await service.processArtifactLifecycleEvent(supabase, {
      artifact_kind: 'presentation',
      lifecycle_event: 'published',
      artifact_id: 'presentation_1',
      campaign_id: 'campaign_1',
      user_id: 'user_1',
      org_id: null,
      title: 'Demo Deck',
      status: 'published',
    })

    expect(result).toEqual({ processed: true, spaces: 1 })
    expect(repo.findSpacesByCampaignForOwner).toHaveBeenCalledWith(
      supabase,
      'user_1',
      'campaign_1',
      null,
    )
    expect(repo.createItem).toHaveBeenCalledOnce()
    expect(repo.createActivity).toHaveBeenCalledOnce()
  })

  it('executes artifact actions against artifact tables and links the triggering item', async () => {
    const insert = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: { id: 'artifact_1' }, error: null }),
      }),
    }))
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Artifact actions',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'create_artifact',
                  artifact_kind: 'presentation',
                  title_template: 'Deck for {{task.title}}',
                },
                {
                  type: 'publish_artifact',
                  artifact_kind: 'presentation',
                  artifact_id: 'presentation_1',
                },
                {
                  type: 'attach_artifact_to_item',
                  artifact_kind: 'presentation',
                  artifact_id: 'presentation_1',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({
        id: 'item_1',
        title: 'Launch',
        custom_data: {},
      }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      updateItem: vi.fn().mockResolvedValue({ id: 'item_1' }),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'presentations') return { insert, update }
        if (table === 'space_automation_runs') return { insert: vi.fn().mockResolvedValue({}) }
        return chain({ data: null, error: null })
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

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user_1',
        name: 'Deck for Launch',
        status: 'draft',
      }),
    )
    expect(update).toHaveBeenCalledWith({ status: 'published', updated_at: expect.any(String) })
    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      'item_1',
      {
        custom_data: {
          artifact: {
            kind: 'presentation',
            id: 'presentation_1',
          },
        },
      },
      null,
    )
  })
})
