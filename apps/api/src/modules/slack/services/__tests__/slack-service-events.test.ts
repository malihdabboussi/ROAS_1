import { describe, expect, it, vi } from 'vitest'
import { SlackEventsBase, type SlackAgentTurn } from '../slack-service-events.base'
import { GENERIC_SLACK_AGENT_ERROR_MESSAGE } from '../slack-service.shared'

class TestSlackEvents extends SlackEventsBase {
  response: string | null = 'Pixel reply'
  routeError: Error | null = null
  readonly sendReply = vi.fn(async () => undefined)

  constructor(readonly slackApiMock: Record<string, ReturnType<typeof vi.fn>>) {
    super(
      slackApiMock as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    )
  }

  async runProcessAndReply(): Promise<void> {
    await this.processAndReply({
      userId: 'user-1',
      agentKey: 'pixel',
      botToken: 'xoxb-token',
      channelId: 'D123',
      message: 'Do the work',
      teamId: 'T123',
      threadTs: '100.1',
      messageTs: '100.1',
      accessToken: 'access-token',
    })
  }

  async collect(response: Response): Promise<string | null> {
    return this.collectSseResponse(response)
  }

  async threadContext(
    botToken: string,
    channelId: string,
    threadTs: string,
    messageTs: string,
  ): Promise<string> {
    return this.buildSlackThreadReplyContext(botToken, channelId, threadTs, messageTs)
  }

  protected async routeToAgent(): Promise<SlackAgentTurn | null> {
    if (this.routeError) throw this.routeError
    return { content: this.response, toolEvents: [], conversationId: null }
  }

  protected async sendSlackReply(
    botToken: string,
    channelId: string,
    text: string,
    threadTs: string | undefined,
  ): Promise<void> {
    await this.sendReply(botToken, channelId, text, threadTs)
  }
}

function createHarness() {
  const slackApi = {
    addReaction: vi.fn(async () => true),
    removeReaction: vi.fn(async () => undefined),
    postMessage: vi.fn(async () => ({ ok: true })),
    conversationsRepliesAll: vi.fn(async () => []),
  }
  return { slackApi, service: new TestSlackEvents(slackApi) }
}

function sseResponse(data: string): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(data))
        controller.close()
      },
    }),
  )
}

describe('SlackEventsBase reply lifecycle', () => {
  it('replaces eyes with a checkmark only after the Slack reply is delivered', async () => {
    const { service, slackApi } = createHarness()

    await service.runProcessAndReply()

    expect(slackApi.addReaction).toHaveBeenNthCalledWith(1, 'xoxb-token', 'D123', '100.1', 'eyes')
    expect(service.sendReply).toHaveBeenCalledWith('xoxb-token', 'D123', 'Pixel reply', '100.1')
    expect(slackApi.removeReaction).toHaveBeenCalledWith('xoxb-token', 'D123', '100.1', 'eyes')
    expect(slackApi.addReaction).toHaveBeenNthCalledWith(
      2,
      'xoxb-token',
      'D123',
      '100.1',
      'white_check_mark',
    )
    expect(service.sendReply.mock.invocationCallOrder[0]).toBeLessThan(
      slackApi.addReaction.mock.invocationCallOrder[1]!,
    )
  })

  it('posts an error and never adds a checkmark when the agent returns no answer', async () => {
    const { service, slackApi } = createHarness()
    service.response = null

    await service.runProcessAndReply()

    expect(slackApi.removeReaction).toHaveBeenCalledWith('xoxb-token', 'D123', '100.1', 'eyes')
    expect(slackApi.postMessage).toHaveBeenCalledWith(
      'xoxb-token',
      'D123',
      GENERIC_SLACK_AGENT_ERROR_MESSAGE,
      '100.1',
    )
    expect(slackApi.addReaction).not.toHaveBeenCalledWith(
      'xoxb-token',
      'D123',
      '100.1',
      'white_check_mark',
    )
  })

  it('keeps success unmarked when Slack reply delivery fails', async () => {
    const { service, slackApi } = createHarness()
    service.sendReply.mockRejectedValueOnce(new Error('chat.postMessage failed'))

    await service.runProcessAndReply()

    expect(slackApi.postMessage).toHaveBeenCalledWith(
      'xoxb-token',
      'D123',
      GENERIC_SLACK_AGENT_ERROR_MESSAGE,
      '100.1',
    )
    expect(slackApi.addReaction).not.toHaveBeenCalledWith(
      'xoxb-token',
      'D123',
      '100.1',
      'white_check_mark',
    )
  })

  it('surfaces structured stream errors that contain a code but no message', async () => {
    const { service } = createHarness()
    const response = sseResponse('data: {"type":"error","code":"no_answer"}\n\ndata: [DONE]\n\n')

    await expect(service.collect(response)).rejects.toThrow('no_answer')
  })

  it('includes the proactive root message when a user replies with a pronoun', async () => {
    const { service, slackApi } = createHarness()
    slackApi.conversationsRepliesAll.mockResolvedValueOnce([
      {
        ts: '100.1',
        bot_id: 'B1',
        text: 'Fathom needs to be reconnected before meeting processing can resume.',
      },
      {
        ts: '100.2',
        user: 'U1',
        thread_ts: '100.1',
        text: "It was connected. Are you sure it's not?",
      },
    ])

    const context = await service.threadContext('xoxb-token', 'D123', '100.1', '100.2')

    expect(context).toContain(
      'Pixel: Fathom needs to be reconnected before meeting processing can resume.',
    )
    expect(context).not.toContain("It was connected. Are you sure it's not?")
  })
})
