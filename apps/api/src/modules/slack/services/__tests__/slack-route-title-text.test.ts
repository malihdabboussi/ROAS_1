import { describe, expect, it, vi } from 'vitest'
import { SlackEventsBase } from '../slack-service-events.base'

const WRAPPED = '[Ask kind]\nKind: client\nSignals: channel stamp\n\ncan you pull the webinar numbers?'
const RAW = 'can you pull the webinar numbers?'

/**
 * Conversation naming must use the raw human message, not the prompt-wrapped turn —
 * otherwise every Slack chat in the sidebar is titled "[Ask kind] Kind: client …".
 */
class TestRoute extends SlackEventsBase {
  readonly createSeenTitles: Array<string | undefined> = []
  readonly retitleSeenMessages: string[] = []

  constructor(readonly invoke: ReturnType<typeof vi.fn>) {
    super(
      { postMessage: vi.fn() } as never,
      {} as never,
      { getServiceRoleClient: () => ({}) } as never,
      {} as never,
      {} as never,
      {} as never,
      { invoke } as never,
      {} as never,
    )
  }

  protected async getOrCreateSlackConversation(
    _supabase: never,
    _userId: string,
    _agentKey: string,
    _teamId: string,
    _channelId: string,
    _threadTs: string | undefined,
    _orgId: string | null | undefined,
    firstMessage?: string,
  ): Promise<{ id: string; title: string | null }> {
    this.createSeenTitles.push(firstMessage)
    return { id: 'conv-1', title: null }
  }

  protected async retitleSlackConversationIfNeeded(
    _supabase: never,
    _conversationId: string,
    _userId: string,
    firstMessage: string,
  ): Promise<void> {
    this.retitleSeenMessages.push(firstMessage)
  }

  protected async collectSseResponse(): Promise<string | null> {
    return 'ok'
  }

  route(titleText?: string) {
    return this.routeToAgent(
      'user-1',
      'pixel',
      WRAPPED,
      'T1',
      'C0B5MKP7Y30',
      undefined,
      'access',
      'xoxb',
      '1.1',
      'org-1',
      undefined,
      undefined,
      null,
      titleText,
    )
  }
}

describe('routeToAgent conversation naming', () => {
  it('titles from the raw human message while the agent still gets the wrapped prompt', async () => {
    const invoke = vi.fn(async () => new Response('', { status: 200 }))
    const service = new TestRoute(invoke)
    await service.route(RAW)
    expect(service.createSeenTitles).toEqual([RAW])
    expect(service.retitleSeenMessages).toEqual([RAW])
    const body = JSON.parse((invoke.mock.calls[0][2] as { body: string }).body)
    expect(body.content).toBe(WRAPPED)
  })

  it('falls back to the full message when no raw text is provided', async () => {
    const invoke = vi.fn(async () => new Response('', { status: 200 }))
    const service = new TestRoute(invoke)
    await service.route(undefined)
    expect(service.createSeenTitles).toEqual([WRAPPED])
  })
})
