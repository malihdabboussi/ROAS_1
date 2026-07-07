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

function supabaseWithEmailArtifact(email: { id: string; subject: string; body: string } | null) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'space_automation_runs') return { insert: vi.fn().mockResolvedValue({}) }
      if (table === 'emails') {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue({ data: email, error: null }),
        }
        return chain
      }
      return {}
    }),
  }
}

function supabaseForSendToAgent() {
  return {
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
}

describe('SpaceAutomationService communication actions', () => {
  it('executes send_email via Composio without logging message body', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Send email',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'send_email',
                  tool_slug: 'GMAIL_SEND_EMAIL',
                  connected_account_id: 'ca_gmail',
                  to: 'lead@example.com',
                  subject_template: 'Task: {{task.title}}',
                  body_template: 'Body for {{task.title}}',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Follow up' }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      createActivity: vi.fn().mockResolvedValue({}),
    }
    const composio = { executeTool: vi.fn().mockResolvedValue({ ok: true }) }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      composio as never,
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

    expect(composio.executeTool).toHaveBeenCalledWith(
      'GMAIL_SEND_EMAIL',
      'user_1',
      {
        to: 'lead@example.com',
        subject: 'Task: Follow up',
        body: 'Body for Follow up',
        is_html: false,
      },
      'ca_gmail',
    )
    expect(repo.createActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        item_id: 'item_1',
        event_type: 'automation_action',
        payload: expect.objectContaining({
          action_type: 'send_email',
          status: 'success',
          summary: 'Sent email',
        }),
      }),
    )
  })

  it('converts markdown email bodies to HTML before sending', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Send markdown email',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'send_email',
                  tool_slug: 'GMAIL_SEND_EMAIL',
                  connected_account_id: 'ca_gmail',
                  to: 'lead@example.com',
                  subject_template: 'Task: {{task.title}}',
                  body_template: 'Hi\n\n1. **Bold Label**: Value\n\n- **Step one**\n- Step two',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Follow up' }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const composio = { executeTool: vi.fn().mockResolvedValue({ successful: true }) }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      composio as never,
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

    expect(composio.executeTool).toHaveBeenCalledWith(
      'GMAIL_SEND_EMAIL',
      'user_1',
      expect.objectContaining({
        is_html: true,
        body: expect.stringContaining('<strong>Bold Label</strong>'),
      }),
      'ca_gmail',
    )
  })

  it('marks send_email as failed when Composio returns an unsuccessful result', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Send email',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'send_email',
                  tool_slug: 'GMAIL_SEND_EMAIL',
                  connected_account_id: 'ca_gmail',
                  to: '{{task.custom.email}}',
                  subject_template: 'Task: {{task.title}}',
                  body_template: 'Body for {{task.title}}',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi
        .fn()
        .mockResolvedValue({ id: 'item_1', title: 'Follow up', custom_data: {} }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      createActivity: vi.fn().mockResolvedValue({}),
    }
    const runInsert = vi.fn().mockResolvedValue({})
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_automation_runs') return { insert: runInsert }
        return {}
      }),
    }
    const composio = {
      executeTool: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid recipient' },
        successful: false,
      }),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      composio as never,
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

    expect(runInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        actions_executed: [
          expect.objectContaining({
            type: 'send_email',
            error: expect.stringContaining('Invalid recipient'),
          }),
        ],
      }),
    )
    expect(repo.createActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        item_id: 'item_1',
        event_type: 'automation_action',
        payload: expect.objectContaining({
          action_type: 'send_email',
          status: 'failed',
          summary: 'Failed send email',
        }),
      }),
    )
  })

  it('executes send_email with subject and body from a linked email artifact', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Send email artifact',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'send_email',
                  tool_slug: 'GMAIL_SEND_EMAIL',
                  connected_account_id: 'ca_gmail',
                  to: 'lead@example.com',
                  subject_source: 'artifact',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({
        id: 'item_1',
        title: 'Follow up',
        custom_data: { artifact: { kind: 'email', id: 'email_1' } },
      }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const composio = { executeTool: vi.fn().mockResolvedValue({ ok: true }) }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      composio as never,
    )

    await service.evaluate(
      { type: 'task_created', in_status: 'todo' },
      {
        supabase: supabaseWithEmailArtifact({
          id: 'email_1',
          subject: 'Draft subject',
          body: 'Draft body',
        }) as never,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'item_1',
        depth: 0,
      },
    )

    expect(composio.executeTool).toHaveBeenCalledWith(
      'GMAIL_SEND_EMAIL',
      'user_1',
      {
        to: 'lead@example.com',
        subject: 'Draft subject',
        body: 'Draft body',
        is_html: false,
      },
      'ca_gmail',
    )
  })

  it('injects the save_email contract when send_to_agent outputs an email artifact', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        campaign_id: 'campaign_1',
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Draft with agent',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'send_to_agent',
                  agent_key: 'copywriter',
                  prompt_template: 'Draft a reply',
                  output_type: 'email_artifact',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Follow up' }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const config = {
      get: vi.fn((key: string) => (key === 'INTERNAL_API_TOKEN' ? 'token' : '')),
    }
    const credits = {
      assertHasAvailableCredits: vi.fn().mockResolvedValue({ totalAvailable: 100 }),
    }
    const userAgentApi = {
      invoke: vi.fn().mockResolvedValue({ ok: true }),
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
        supabase: supabaseForSendToAgent() as never,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'item_1',
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
      campaign_id: string | null
      prompt: string
    }
    expect(body.campaign_id).toBe('campaign_1')
    expect(body.prompt).toContain('OUTPUT CONTRACT')
    expect(body.prompt).toContain('save_email')
    expect(body.prompt).toContain('"space_id": "space_1"')
    expect(body.prompt).toContain('"source_item_id": "item_1"')
  })

  it('executes send_slack_message through the native Slack tool service', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Send Slack',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'send_slack_message',
                  channel_id: 'C123',
                  text_template: 'Task: {{task.title}}',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Follow up' }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const slackTools = { sendMessage: vi.fn().mockResolvedValue({ success: true }) }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
      slackTools as never,
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

    expect(slackTools.sendMessage).toHaveBeenCalledWith(expect.anything(), 'user_1', null, {
      channel_id: 'C123',
      text: 'Task: Follow up',
      thread_ts: undefined,
    })
  })

  it('executes send_channel_message by creating a channel message', async () => {
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Send channel',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [
                {
                  type: 'send_channel_message',
                  channel_id: 'channel_1',
                  content_template: 'Task: {{task.title}}',
                },
              ],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Follow up' }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }
    const channelsRepo = { createMessage: vi.fn().mockResolvedValue({ id: 'message_1' }) }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
      undefined,
      channelsRepo as never,
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

    expect(channelsRepo.createMessage).toHaveBeenCalledWith(expect.anything(), {
      channel_id: 'channel_1',
      sender_type: 'system',
      sender_id: 'automation',
      content: 'Task: Follow up',
      content_blocks: null,
      metadata: { automation: true, item_id: 'item_1', space_id: 'space_1' },
    })
  })
})
