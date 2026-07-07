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

describe('SpaceAutomationService external Slack events', () => {
  it('creates one Space item and runs the matching automation for a Slack DM event', async () => {
    const createdItem = { id: 'item_1', title: 'Slack message from U123: Hello from Slack' }
    const route = {
      id: 'route_1',
      space_id: 'space_1',
      automation_id: 'automation_1',
      user_id: 'user_1',
      org_id: null,
      filters: { channel_id: 'D123' },
    }
    const repo = {
      createItem: vi.fn().mockResolvedValue(createdItem),
      createActivity: vi.fn().mockResolvedValue({}),
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Slack automation',
              enabled: true,
              trigger: {
                type: 'external_slack_message_received',
                trigger_slug: 'SLACK_RECEIVE_DIRECT_MESSAGE',
                connected_account_id: 'ca_slack',
                channel_id: 'D123',
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
          return {
            select: () => ({
              eq: () => ({ eq: () => chain({ data: route, error: null }) }),
            }),
          }
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

    const result = await service.processComposioExternalEvent(supabase as never, {
      id: 'evt_slack_1',
      metadata: {
        trigger_slug: 'SLACK_RECEIVE_DIRECT_MESSAGE',
        trigger_id: 'ti_slack',
        connected_account_id: 'ca_slack',
      },
      data: {
        channel: 'D123',
        user: 'U123',
        text: 'Hello from Slack',
        ts: '1710000000.000100',
      },
    })

    expect(result).toEqual({ processed: true, item_id: null, automation_id: 'automation_1' })
    expect(repo.createItem).not.toHaveBeenCalled()
    expect(repo.createActivity).not.toHaveBeenCalled()
  })
})
