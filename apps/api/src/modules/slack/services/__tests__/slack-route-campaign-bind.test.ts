import { describe, expect, it, vi } from 'vitest'
import { SlackEventsBase } from '../slack-service-events.base'

/** routeToAgent must forward the resolved client campaign so agent-api binds CONNECTIONS (§11.2). */
class TestRoute extends SlackEventsBase {
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

  protected async getOrCreateSlackConversation(): Promise<{ id: string; title: string | null }> {
    return { id: 'conv-1', title: null }
  }

  protected async retitleSlackConversationIfNeeded(): Promise<void> {}

  protected async collectSseResponse(): Promise<string | null> {
    return 'ok'
  }

  route(campaignId: string | null) {
    return this.routeToAgent(
      'user-1',
      'pixel',
      'what were the numbers on the last webinar?',
      'T1',
      'C0B5MKP7Y30',
      undefined,
      'access',
      'xoxb',
      '1.1',
      'org-1',
      undefined,
      undefined,
      campaignId,
    )
  }
}

describe('routeToAgent CONNECTIONS bind', () => {
  it('sends campaign_id when the ask resolved to a client campaign', async () => {
    const invoke = vi.fn(async () => new Response('', { status: 200 }))
    const service = new TestRoute(invoke)
    await service.route('bad92814-a1cb-4b66-ba92-66dd02dc42e1')
    const body = JSON.parse((invoke.mock.calls[0][2] as { body: string }).body)
    expect(body.campaign_id).toBe('bad92814-a1cb-4b66-ba92-66dd02dc42e1')
    expect(body.source).toBe('slack')
  })

  it('omits campaign_id for general asks', async () => {
    const invoke = vi.fn(async () => new Response('', { status: 200 }))
    const service = new TestRoute(invoke)
    await service.route(null)
    const body = JSON.parse((invoke.mock.calls[0][2] as { body: string }).body)
    expect(body).not.toHaveProperty('campaign_id')
  })
})
