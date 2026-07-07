import { describe, expect, it, vi } from 'vitest'
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

describe('SpaceAutomationService create_task context bridge', () => {
  it('lets external triggers create a task before running task actions', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Email to task',
              enabled: true,
              trigger: {
                type: 'external_email_received',
                provider: 'gmail',
                trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
                connected_account_id: 'account_1',
              },
              actions: [
                {
                  type: 'create_task',
                  title_template: 'Follow up: {{task.title}}',
                  assignees: [{ type: 'agent', id: 'agent_atlas' }],
                  notes_template: 'From: {{trigger.from}}\nCC: {{trigger.cc}}\n\n{{trigger.body}}',
                  continuation: 'after_task_completes',
                },
                { type: 'change_status', status: 'in_progress' },
              ],
            },
          ],
        },
      }),
      findItemById: vi
        .fn()
        .mockResolvedValueOnce({ id: 'source_item', title: 'Inbound email', custom_data: {} })
        .mockResolvedValueOnce({
          id: 'created_item',
          title: 'Follow up: Inbound email',
          custom_data: {},
        }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      createItem: vi
        .fn()
        .mockResolvedValue({ id: 'created_item', title: 'Follow up: Inbound email' }),
      updateItem: vi.fn().mockResolvedValue({ id: 'created_item', status: 'in_progress' }),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    await service.evaluate(
      {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: 'account_1',
        from: 'lead@example.com',
        subject: 'Need help',
        body: 'Please follow up on this request.',
        cc: 'manager@example.com',
      },
      {
        supabase: supabaseWithRunLog() as never,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'source_item',
        depth: 0,
      },
    )

    expect(repo.createItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      expect.objectContaining({
        title: 'Follow up: Inbound email',
        assignees: [{ type: 'agent', id: 'agent_atlas' }],
        assignee_type: 'agent',
        assignee_id: 'agent_atlas',
        description:
          'From: lead@example.com\nCC: manager@example.com\n\nPlease follow up on this request.',
        custom_data: expect.objectContaining({
          email: 'lead@example.com',
          external_email: {
            from: 'lead@example.com',
            email: 'lead@example.com',
            subject: 'Need help',
            body: 'Please follow up on this request.',
            cc: 'manager@example.com',
          },
        }),
      }),
      null,
    )
    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      'created_item',
      { status: 'in_progress' },
      null,
    )
  })

  it('can target the trigger task after create_task', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Create task then update trigger',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                { type: 'create_task', title_template: 'Child task' },
                { type: 'change_status', status: 'in_review', target_item_ref: 'trigger' },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn(async (_supabase, _spaceId, itemId) => ({
        id: itemId,
        title: itemId === 'source_item' ? 'Source task' : 'Child task',
        custom_data: {},
      })),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      createItem: vi.fn().mockResolvedValue({ id: 'created_item', title: 'Child task' }),
      updateItem: vi.fn().mockResolvedValue({ id: 'source_item', status: 'in_review' }),
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
        itemId: 'source_item',
        depth: 0,
      },
    )

    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      'source_item',
      { status: 'in_review' },
      null,
    )
  })

  it('can target a task created by a previous step', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        campaign_id: 'campaign_1',
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Create task then run agent',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                { type: 'create_task', title_template: 'Child task' },
                {
                  type: 'send_to_agent',
                  agent_key: 'zara',
                  prompt_template: 'Handle child task',
                  target_item_ref: '{{steps.1.item_id}}',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn(async (_supabase, _spaceId, itemId) => ({
        id: itemId,
        title: itemId === 'source_item' ? 'Source task' : 'Child task',
        custom_data: {},
      })),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      createItem: vi.fn().mockResolvedValue({ id: 'created_item', title: 'Child task' }),
    }
    const config = {
      get: vi.fn((key: string) => (key === 'INTERNAL_API_TOKEN' ? 'token' : '')),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_automation_runs') return { insert: vi.fn().mockResolvedValue({}) }
        if (table === 'space_items') {
          const chain = {
            update: vi.fn(() => chain),
            eq: vi.fn(() => chain),
          }
          return chain
        }
        return {}
      }),
    }
    const credits = {
      assertHasAvailableCredits: vi.fn().mockResolvedValue({ totalAvailable: 100 }),
    }
    const userAgentApi = {
      invoke: vi.fn().mockResolvedValue({ ok: true, status: 202 }),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      config as never,
      {} as never,
      undefined,
      undefined,
      credits as never,
      userAgentApi as never,
    )

    await service.evaluate(
      { type: 'task_created', in_status: 'todo' },
      {
        supabase: supabase as never,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'source_item',
        depth: 0,
      },
    )

    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'user_1',
      '/api/task-agent/invoke',
      expect.any(Object),
      expect.objectContaining({ timeoutMs: 600_000 }),
    )
    const [, , init] = userAgentApi.invoke.mock.calls[0]!
    const body = JSON.parse(String(init.body)) as {
      item_id: string
      campaign_id: string | null
    }
    expect(body.item_id).toBe('created_item')
    expect(body.campaign_id).toBe('campaign_1')
  })

  it('uses trigger email fields and previous create_contact output in later contact actions', async () => {
    const contactInsertSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'contact_1',
        email: 'lead@example.com',
        first_name: 'Lead',
        last_name: 'Person',
      },
      error: null,
    })
    const contactInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: contactInsertSingle })) }))
    const contactUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const contactSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: { tags: [] }, error: null }),
      })),
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'contacts') {
          return { insert: contactInsert, update: contactUpdate, select: contactSelect }
        }
        if (table === 'space_automation_runs') return { insert: vi.fn().mockResolvedValue({}) }
        return {}
      }),
    }
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Email to contact',
              enabled: true,
              trigger: {
                type: 'external_email_received',
                provider: 'gmail',
                trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
                connected_account_id: 'account_1',
              },
              actions: [
                {
                  type: 'create_contact',
                  email_template: '{{trigger.email}}',
                  name_template: '{{trigger.name}}',
                },
                {
                  type: 'add_contact_tag',
                  contact_id: '{{steps.1.contact_id}}',
                  tag: 'inbound-email',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi
        .fn()
        .mockResolvedValue({ id: 'source_item', title: 'Inbound email', custom_data: {} }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    await service.evaluate(
      {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: 'account_1',
        from: 'Lead Person <lead@example.com>',
        subject: 'Need help',
      },
      {
        supabase: supabase as never,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'source_item',
        depth: 0,
      },
    )

    expect(contactInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'lead@example.com',
        first_name: 'Lead',
        last_name: 'Person',
      }),
    )
    expect(contactUpdate).toHaveBeenCalledWith({ tags: ['inbound-email'] })
  })
})
