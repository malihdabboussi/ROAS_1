import { describe, expect, it, vi } from 'vitest'
import { TaskAgentRepository } from './repositories/task-agent.repository'
import { TaskAgentService } from './services/task-agent.service'

function buildService(content: string) {
  const openClaw = {
    streamCompletion: vi.fn(
      async ({ send }: { send: (type: string, data: any) => Promise<void> }) => {
        await send('content_delta', { content })
        return { content, toolSteps: [] }
      },
    ),
  }
  const agentRuntime = {
    resolveConversationRuntime: vi.fn().mockResolvedValue({
      gatewayAgentId: 'vibey',
      agentKey: 'vibey',
    }),
    buildChatSessionKey: vi.fn().mockReturnValue('session-key'),
  }
  const service = new TaskAgentService(
    new TaskAgentRepository({ client: {} } as never),
    openClaw as never,
    agentRuntime as never,
    { ensureRuntimeReady: vi.fn(async () => undefined) } as never,
    {} as never,
    {} as never,
  )
  return { service, openClaw }
}

describe('TaskAgentService.suggestTasks', () => {
  it('parses structured task suggestions and caps them by max_suggestions', async () => {
    const { service } = buildService(
      JSON.stringify({
        tasks: [
          {
            title: 'Send recap',
            description: 'Email the buyer.',
            priority: 'high',
            source_action_index: 0,
          },
          { title: 'Book follow-up', priority: 'medium' },
          { title: 'Ignored overflow', priority: 'low' },
        ],
      }),
    )

    const result = await service.suggestTasks({
      space_id: 'space_1',
      owner_user_id: 'user_1',
      org_id: null,
      agent_key: 'vibey',
      max_suggestions: 2,
      payload: { summary: 'Call summary' },
    })

    expect(result.tasks).toEqual([
      {
        title: 'Send recap',
        description: 'Email the buyer.',
        priority: 'high',
        source_action_index: 0,
      },
      { title: 'Book follow-up', priority: 'medium' },
    ])
  })

  it('returns an empty task list for malformed model output', async () => {
    const { service } = buildService('not json')

    const result = await service.suggestTasks({
      space_id: 'space_1',
      owner_user_id: 'user_1',
      org_id: null,
      max_suggestions: 10,
      payload: { summary: 'Call summary' },
    })

    expect(result.tasks).toEqual([])
  })

  it('returns no tasks when Fathom action_items is an empty array', async () => {
    const { service, openClaw } = buildService(
      JSON.stringify({ tasks: [{ title: 'Invented from transcript', priority: 'high' }] }),
    )

    const result = await service.suggestTasks({
      space_id: 'space_1',
      owner_user_id: 'user_1',
      org_id: null,
      max_suggestions: 10,
      payload: { summary: 'Call summary', action_items: [] },
    })

    expect(result.tasks).toEqual([])
    expect(openClaw.streamCompletion).not.toHaveBeenCalled()
  })
})
