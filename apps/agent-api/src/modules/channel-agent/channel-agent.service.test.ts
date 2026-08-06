import { describe, expect, it, vi } from 'vitest'
import { ChannelAgentRepository } from './repositories/channel-agent.repository'
import { ChannelAgentService } from './services/channel-agent.service'

function makeQuery(result: unknown, limitResult = result) {
  const resolved = { data: limitResult, error: null }
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => resolved),
    maybeSingle: vi.fn(async () => ({ data: result, error: null })),
    insert: vi.fn(async () => ({ data: result, error: null })),
    update: vi.fn(() => query),
    then(
      onFulfilled: (value: typeof resolved) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected)
    },
  }
  return query
}

describe('ChannelAgentService', () => {
  it('prepends access policy to channel context', async () => {
    const startTrace = vi.fn(async () => 'trace-1')
    const streamCompletion = vi.fn(async () => ({
      content: 'Channel handled.',
      failed: undefined,
      toolSteps: [],
      usage: undefined,
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'channel_messages') {
          return makeQuery(
            {
              id: 'msg-1',
              channel_id: 'channel-1',
              sender_type: 'user',
              sender_id: 'user-1',
              content: '@zara help',
              metadata: {},
              reply_to_id: null,
              created_at: '2026-05-11T00:00:00.000Z',
            },
            [],
          )
        }
        if (table === 'channels') return makeQuery({ name: 'ops', description: '' })
        if (table === 'channel_memberships') return makeQuery([])
        return makeQuery(null)
      }),
    }
    const service = new ChannelAgentService(
      new ChannelAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:channel:channel-1'),
      } as any,
      {
        startTrace,
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({
          hasAgentBrain: true,
          brainId: 'brain-zara',
        })),
        buildFullContext: vi.fn(async () => 'AGENT BRAIN — Specific Knowledge:'),
      } as any,
      { set: vi.fn() } as any,
      { parse: vi.fn(async () => []) } as any,
      {
        resolveAgentPolicy: vi.fn(async () => ({
          effective: new Set(),
          grants: [],
          overrides: { allow_extra: [], deny: [] },
        })),
        canAgentUseCapability: vi.fn(async () => false),
      } as any,
    )

    await service.invoke({
      channel_id: 'channel-1',
      message_id: 'msg-1',
      agent_key: 'zara',
      user_id: 'user-1',
      org_id: null,
      campaign_id: 'campaign-1',
    })

    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: string }>
    }
    expect(call.input[0]?.content).toContain('ACCESS POLICY for zara:')
    expect(call.input[0]?.content).toContain('Do NOT call: discover_channel_context, get_campaign')
    expect(call.input[0]?.content).toContain('AGENT BRAIN')
    expect(startTrace).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 'campaign-1' }))
  })

  it('falls back to the channel campaign binding and injects CHANNEL_CONTEXT', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'Scoped reply.',
      failed: undefined,
      toolSteps: [],
      usage: undefined,
    }))
    const buildChatSessionKey = vi.fn(() => 'agent:ivy:user-1:channel:channel-1')
    const requestContextSet = vi.fn()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'channel_messages') {
          return makeQuery(
            {
              id: 'msg-3',
              channel_id: 'channel-1',
              sender_type: 'user',
              sender_id: 'user-1',
              content: '@ivy list avatars',
              metadata: {},
              reply_to_id: null,
              created_at: '2026-06-10T00:00:00.000Z',
            },
            [],
          )
        }
        if (table === 'channels') {
          return makeQuery({
            name: 'Adley Content',
            description: '',
            metadata: { default_campaign_id: 'campaign-9' },
            org_id: 'org-1',
          })
        }
        if (table === 'campaigns') return makeQuery({ name: 'Viralish U' })
        if (table === 'channel_memberships') return makeQuery([])
        return makeQuery(null)
      }),
    }
    const service = new ChannelAgentService(
      new ChannelAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'ivy',
        })),
        buildChatSessionKey,
      } as any,
      {
        startTrace: vi.fn(async () => 'trace-3'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({ hasAgentBrain: false, brainId: null })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
      { set: requestContextSet } as any,
      { parse: vi.fn(async () => []) } as any,
    )

    await service.invoke({
      channel_id: 'channel-1',
      message_id: 'msg-3',
      agent_key: 'ivy',
      user_id: 'user-1',
      org_id: 'org-1',
    })

    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      instructions: string
    }
    expect(call.instructions).toContain(
      'CHANNEL_CONTEXT: This channel is bound to campaign "Viralish U" (id: campaign-9)',
    )
    expect(buildChatSessionKey).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: 'campaign-9' }),
    )
    expect(requestContextSet).toHaveBeenCalledWith(
      'msg-3',
      'user-1',
      'campaign-9',
      '',
      null,
      null,
      'org-1',
      'studio',
      null,
      null,
      'campaign',
    )
  })

  it('injects discovery guidance for unbound org channels', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'Discovering.',
      failed: undefined,
      toolSteps: [],
      usage: undefined,
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'channel_messages') {
          return makeQuery(
            {
              id: 'msg-4',
              channel_id: 'channel-1',
              sender_type: 'user',
              sender_id: 'user-1',
              content: '@ivy list avatars',
              metadata: {},
              reply_to_id: null,
              created_at: '2026-06-10T00:00:00.000Z',
            },
            [],
          )
        }
        if (table === 'channels') {
          return makeQuery({
            name: 'Adley Content',
            description: '',
            metadata: {},
            org_id: 'org-1',
          })
        }
        if (table === 'channel_memberships') return makeQuery([])
        return makeQuery(null)
      }),
    }
    const service = new ChannelAgentService(
      new ChannelAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'ivy',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:ivy:user-1:channel:channel-1'),
      } as any,
      {
        startTrace: vi.fn(async () => 'trace-4'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({ hasAgentBrain: false, brainId: null })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
      { set: vi.fn() } as any,
      { parse: vi.fn(async () => []) } as any,
    )

    await service.invoke({
      channel_id: 'channel-1',
      message_id: 'msg-4',
      agent_key: 'ivy',
      user_id: 'user-1',
      org_id: 'org-1',
    })

    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      instructions: string
    }
    expect(call.instructions).toContain('No campaign is bound to this channel')
    expect(call.instructions).toContain('discover_channel_context')
    expect(call.instructions).toContain('Do NOT assume the General campaign')
  })

  it('includes channel attachments in the trigger message sent to the agent', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'I see the document.',
      failed: undefined,
      toolSteps: [],
      usage: undefined,
    }))
    const attachmentUrl = 'https://cdn.example.com/uploads/report.pdf'
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'channel_messages') {
          return makeQuery(
            {
              id: 'msg-2',
              channel_id: 'channel-1',
              sender_type: 'user',
              sender_id: 'user-1',
              content: 'can you see this doc @ivy',
              metadata: { attachments: [attachmentUrl] },
              reply_to_id: null,
              created_at: '2026-05-18T00:00:00.000Z',
            },
            [],
          )
        }
        if (table === 'channels') return makeQuery({ name: 'ops', description: '' })
        if (table === 'channel_memberships') return makeQuery([])
        return makeQuery(null)
      }),
    }
    const service = new ChannelAgentService(
      new ChannelAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'ivy',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:ivy:user-1:channel:channel-1'),
      } as any,
      {
        startTrace: vi.fn(async () => 'trace-2'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({
          hasAgentBrain: false,
          brainId: null,
        })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
      { set: vi.fn() } as any,
      {
        parse: vi.fn(async () => [
          {
            text: 'Quarterly revenue summary',
            filename: 'report.pdf',
            mimeType: 'application/pdf',
          },
        ]),
      } as any,
    )

    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => Buffer.from('pdf-bytes'),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await service.invoke({
      channel_id: 'channel-1',
      message_id: 'msg-2',
      agent_key: 'ivy',
      user_id: 'user-1',
      org_id: null,
    })

    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ role: string; content: string }>
    }
    const lastUser = [...call.input].reverse().find((msg) => msg.role === 'user')
    expect(lastUser?.content).toContain('USER-UPLOADED DOCUMENTS')
    expect(lastUser?.content).toContain('Quarterly revenue summary')
    expect(lastUser?.content).toContain('report.pdf')

    vi.unstubAllGlobals()
  })
})
