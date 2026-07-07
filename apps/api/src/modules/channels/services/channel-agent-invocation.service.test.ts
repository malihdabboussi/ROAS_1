import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChannelMessageRow, ChannelRow } from '../repositories/channels.repository'
import { ChannelAgentInvocationService } from './channel-agent-invocation.service'

function createChannel(overrides: Partial<ChannelRow> = {}): ChannelRow {
  return {
    id: 'channel-1',
    org_id: 'org-1',
    user_id: 'user-1',
    name: 'Launch',
    description: null,
    is_private: false,
    metadata: { default_campaign_id: 'campaign-1' },
    created_at: '2026-06-17T00:00:00.000Z',
    updated_at: '2026-06-17T00:00:00.000Z',
    ...overrides,
  }
}

function createMessage(overrides: Partial<ChannelMessageRow> = {}): ChannelMessageRow {
  return {
    id: 'message-1',
    channel_id: 'channel-1',
    sender_type: 'user',
    sender_id: 'user-1',
    content: 'Run this',
    content_blocks: null,
    metadata: {
      mentions: [{ type: 'agent', agent_key: 'ceo' }],
      agent_status: { ceo: 'failed' },
      campaign_id: 'campaign-1',
      scope_kind: 'campaign',
    },
    reply_to_id: null,
    thread_name: null,
    pinned: false,
    pinned_by: null,
    created_at: '2026-06-17T00:00:00.000Z',
    updated_at: '2026-06-17T00:00:00.000Z',
    ...overrides,
  }
}

function createServiceClientMock(campaign: Record<string, unknown> | null = { id: 'campaign-1' }) {
  const operations: Array<Record<string, unknown>> = []
  return {
    operations,
    from(table: string) {
      const state: Record<string, unknown> = { table, filters: {} }
      const builder = {
        select(columns: string) {
          state.select = columns
          return builder
        },
        eq(column: string, value: unknown) {
          ;(state.filters as Record<string, unknown>)[column] = value
          return builder
        },
        is(column: string, value: unknown) {
          ;(state.filters as Record<string, unknown>)[column] = value
          return builder
        },
        neq(column: string, value: unknown) {
          ;(state.filters as Record<string, unknown>)[column] = { neq: value }
          return builder
        },
        update(payload: Record<string, unknown>) {
          state.update = payload
          operations.push({ type: 'update', table, payload, filters: state.filters })
          return builder
        },
        maybeSingle() {
          return Promise.resolve({ data: campaign, error: null })
        },
      }
      return builder
    },
  }
}

describe('ChannelAgentInvocationService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('resolves channel default campaign bindings from active campaigns', async () => {
    const serviceClient = createServiceClientMock({ id: 'campaign-1' })
    const service = new ChannelAgentInvocationService(
      {} as never,
      { client: serviceClient } as never,
      {} as never,
      {} as never,
      {} as never,
    )

    await expect(service.resolveChannelBindingScope(createChannel())).resolves.toEqual({
      space_id: null,
      campaign_id: 'campaign-1',
      scope_kind: 'campaign',
    })
  })

  it('stamps auto invocation metadata without dropping existing metadata', async () => {
    const serviceClient = createServiceClientMock()
    const service = new ChannelAgentInvocationService(
      {} as never,
      { client: serviceClient } as never,
      {} as never,
      {} as never,
      {} as never,
    )

    await service.stampAutoInvokeMetadata('message-1', ['ceo'], { existing: true })

    expect(serviceClient.operations).toHaveLength(1)
    expect(serviceClient.operations[0]).toMatchObject({
      type: 'update',
      table: 'channel_messages',
      payload: {
        metadata: {
          existing: true,
          agent_status: { ceo: 'acknowledged' },
        },
      },
      filters: { id: 'message-1' },
    })
    expect(
      typeof (
        serviceClient.operations[0].payload as { metadata: Record<string, unknown> }
      ).metadata.agent_invoked_at,
    ).toBe('string')
  })

  it('resets retry metadata and invokes the mentioned agent', async () => {
    vi.stubEnv('INTERNAL_API_TOKEN', 'internal-token')
    const serviceClient = createServiceClientMock()
    const userAgentApi = {
      invoke: vi.fn().mockResolvedValue({ ok: true, status: 202 }),
    }
    const creditsService = {
      assertHasAvailableCredits: vi.fn().mockResolvedValue(undefined),
    }
    const service = new ChannelAgentInvocationService(
      {} as never,
      { client: serviceClient } as never,
      userAgentApi as never,
      creditsService as never,
      {} as never,
    )

    await expect(
      service.retryAgentInvocation({
        channel: createChannel(),
        message: createMessage(),
        scope: { userId: 'user-1', orgId: 'org-1' } as never,
        agentKey: 'ceo',
      }),
    ).resolves.toEqual({ accepted: true })

    expect(serviceClient.operations[0]).toMatchObject({
      type: 'update',
      table: 'channel_messages',
      payload: {
        metadata: {
          agent_status: { ceo: 'acknowledged' },
          agent_phase: null,
          agent_last_activity: null,
        },
      },
      filters: { id: 'message-1' },
    })
    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'user-1',
      '/api/channel-agent/invoke',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"campaign_id":"campaign-1"'),
      }),
      expect.objectContaining({ timeoutMs: 600_000 }),
    )
  })
})
