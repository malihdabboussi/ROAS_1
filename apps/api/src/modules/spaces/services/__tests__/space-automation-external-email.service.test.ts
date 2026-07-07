import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { automationsRepoFromRepo, emptyAutomationsRepo } from './space-automation-test-utils'

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

function buildProcessEmailSupabase(route: Record<string, unknown>) {
  return {
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
}

describe('SpaceAutomationService external email events', () => {
  it('passes Gmail inbox category filters to Composio trigger config', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_external_automation_triggers') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            upsert,
            update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
          }
        }
        if (table === 'space_contact_automation_routes') {
          return { update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }
        }
        return chain({ data: null, error: null })
      }),
    }
    const composio = {
      createTrigger: vi.fn().mockResolvedValue({ triggerId: 'trigger_1' }),
    }
    const service = new SpaceAutomationService(
      {} as never,
      emptyAutomationsRepo() as never,
      {} as never,
      composio as never,
    )

    await service.syncExternalTriggerForAutomation(supabase as never, 'user_1', null, 'space_1', {
      id: 'automation_1',
      enabled: true,
      is_draft: false,
      created_by: 'user_1',
      trigger: {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: 'ca_1',
        gmail_category: 'primary',
      },
    })

    expect(composio.createTrigger).toHaveBeenCalledWith('user_1', 'GMAIL_NEW_GMAIL_MESSAGE', {
      connectedAccountId: 'ca_1',
      triggerConfig: { interval: 10, query: 'in:inbox category:primary', userId: 'me' },
    })
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          gmail_category: 'primary',
          _trigger_interval: 10,
        }),
      }),
      { onConflict: 'space_id,automation_id' },
    )
  })

  it('dedupes repeated Composio webhook events', async () => {
    const supabase = {
      from: vi.fn(() => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ error: { code: '23505', message: 'duplicate' } }),
          }),
        }),
      })),
    }
    const service = new SpaceAutomationService(
      {} as never,
      emptyAutomationsRepo() as never,
      {} as never,
      {} as never,
    )

    const result = await service.processComposioExternalEmailEvent(supabase as never, {
      id: 'evt_1',
      metadata: {
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        trigger_id: 'ti_1',
        connected_account_id: 'ca_1',
      },
      data: {},
    })

    expect(result).toEqual({ processed: false, duplicate: true })
  })

  it('does not create a Space item when the automation has no create_task action', async () => {
    const route = {
      id: 'route_1',
      space_id: 'space_1',
      automation_id: 'automation_1',
      user_id: 'user_1',
      org_id: null,
      filters: { from_contains: 'sender@', subject_contains: 'Hell' },
    }
    const repo = {
      createItem: vi.fn(),
      createActivity: vi.fn(),
      findSpaceById: vi.fn().mockResolvedValue({ schema: {} }),
    }
    const supabase = buildProcessEmailSupabase(route)
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    const executeSpy = vi.spyOn(service, 'executeAutomationById').mockResolvedValue(null)

    const result = await service.processComposioExternalEmailEvent(supabase as never, {
      id: 'evt_1',
      metadata: {
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        trigger_id: 'ti_1',
        connected_account_id: 'ca_1',
      },
      data: {
        sender: 'sender@example.com',
        subject: 'Hello',
        message_text: 'Email body',
        cc: [{ name: 'Copy Person', email: 'copy@example.com' }],
        message_timestamp: '2026-05-09T08:00:00.000Z',
      },
    })

    expect(result).toEqual({
      processed: true,
      item_id: null,
      automation_id: 'automation_1',
    })
    expect(repo.createItem).not.toHaveBeenCalled()
    expect(repo.createActivity).not.toHaveBeenCalled()
    expect(executeSpy).toHaveBeenCalledWith(
      'automation_1',
      expect.objectContaining({ type: 'external_email_received', subject: 'Hello' }),
      expect.objectContaining({ itemId: '', spaceId: 'space_1' }),
    )
    executeSpy.mockRestore()
  })

  it('creates one Space item when the automation includes create_task', async () => {
    const createdItem = { id: 'item_1', title: 'Hello' }
    const route = {
      id: 'route_1',
      space_id: 'space_1',
      automation_id: 'automation_1',
      user_id: 'user_1',
      org_id: null,
      filters: {},
    }
    const repo = {
      createItem: vi.fn().mockResolvedValue(createdItem),
      createActivity: vi.fn().mockResolvedValue({}),
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Email automation',
              enabled: true,
              is_draft: false,
              trigger: {
                type: 'external_email_received',
                provider: 'gmail',
                trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
                connected_account_id: 'ca_1',
              },
              actions: [
                {
                  type: 'create_task',
                  title_template: '{{trigger.subject}}',
                  notes_template: '{{trigger.body}}',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue(createdItem),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const supabase = buildProcessEmailSupabase(route)
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    const result = await service.processComposioExternalEmailEvent(supabase as never, {
      id: 'evt_1',
      metadata: {
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        trigger_id: 'ti_1',
        connected_account_id: 'ca_1',
      },
      data: {
        sender: 'sender@example.com',
        subject: 'Hello',
        message_text: 'Email body',
      },
    })

    expect(result).toEqual({
      processed: true,
      item_id: 'item_1',
      automation_id: 'automation_1',
    })
    expect(repo.createItem).toHaveBeenCalledTimes(1)
    expect(repo.createItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      expect.objectContaining({
        title: 'Hello',
        description: 'Email body',
        custom_data: expect.objectContaining({
          external_email: expect.objectContaining({ subject: 'Hello' }),
          _automation_created: true,
        }),
      }),
      null,
    )
  })

  it('normalizes Composio Gmail subject summary lines to the SMTP subject for trigger context', async () => {
    const route = {
      id: 'route_wrap',
      space_id: 'space_1',
      automation_id: 'automation_1',
      user_id: 'user_1',
      org_id: null,
      filters: {},
    }
    const repo = {
      createItem: vi.fn(),
      createActivity: vi.fn(),
      findSpaceById: vi.fn().mockResolvedValue({ schema: {} }),
    }
    const supabase = buildProcessEmailSupabase(route)
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    const executeSpy = vi.spyOn(service, 'executeAutomationById').mockResolvedValue(null)

    await service.processComposioExternalEmailEvent(supabase as never, {
      id: 'evt_wrap',
      metadata: {
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        trigger_id: 'ti_1',
        connected_account_id: 'ca_1',
      },
      data: {
        sender: 'Healing Waves <seffyzz@gmail.com>',
        subject: 'Gmail email from Healing Waves <seffyzz@gmail.com>: My Son PRO Player',
        message_text: 'body',
      },
    })

    expect(repo.createItem).not.toHaveBeenCalled()
    expect(executeSpy).toHaveBeenCalledWith(
      'automation_1',
      expect.objectContaining({
        type: 'external_email_received',
        subject: 'My Son PRO Player',
      }),
      expect.objectContaining({ itemId: '' }),
    )
    executeSpy.mockRestore()
  })
})
