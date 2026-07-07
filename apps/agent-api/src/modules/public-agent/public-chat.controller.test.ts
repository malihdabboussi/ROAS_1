import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveContactViaInternalApi } from './contact-resolution.util'
import { PublicChatController } from './controllers/public-chat.controller'
import { PublicAgentRepository } from './repositories/public-agent.repository'
import { PublicAgentChatService } from './services/public-agent-chat.service'
import { PublicAgentService } from './services/public-agent.service'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('./contact-resolution.util', () => ({
  resolveContactViaInternalApi: vi.fn(),
}))

interface QueryResult {
  data?: unknown
  error?: { message: string } | null
}

function makeQuery(result: QueryResult) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then(onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }
  return query
}

function makeSupabase(tableQueries: Record<string, any[] | any>) {
  return {
    from: vi.fn((table: string) => {
      const tableQuery = tableQueries[table]
      if (Array.isArray(tableQuery)) {
        const next = tableQuery.shift()
        if (!next) throw new Error(`No query left for ${table}`)
        return next
      }
      return tableQuery
    }),
  }
}

function makeResponse() {
  const res: any = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    on: vi.fn(() => res),
    destroyed: false,
    writableEnded: false,
  }
  return res
}

function makeRequest(widgetCampaignId: string | null = 'campaign-1') {
  return {
    on: vi.fn(),
    publicAgent: {
      userId: 'user-1',
      orgId: 'org-1',
      agentKey: 'zara',
      widgetCampaignId,
    },
  } as any
}

function makeController() {
  const repository = new PublicAgentRepository({ client: {} } as any)
  const publicAgentService = new PublicAgentService(repository)
  vi.spyOn(publicAgentService, 'resolveOwnerContext').mockResolvedValue({
    accessToken: 'owner-token',
    refreshToken: 'refresh-token',
    orgId: 'org-1',
    actingUserId: 'user-1',
  })
  const chatService = {
    processMessage: vi.fn(async ({ send }: any) => {
      await send('delta', { content: 'Streamed reply' })
    }),
    prewarmChatContext: vi.fn(async () => ({
      ok: true,
      cache_key: 'cache-key',
      reused: false,
      cache_status: 'built_on_send',
      store: 'memory',
      duration_ms: 5,
    })),
    prewarmAgentChatContext: vi.fn(async () => ({
      ok: true,
      cache_key: 'agent-cache-key',
      reused: false,
      cache_status: 'built_on_send',
      store: 'memory',
      duration_ms: 4,
    })),
  }
  const creditsService = {
    assertHasAvailableCredits: vi.fn(async () => undefined),
  }
  const publicAgentChatService = new PublicAgentChatService(publicAgentService, repository)
  const controller = new PublicChatController(
    chatService as any,
    publicAgentChatService,
    creditsService as any,
  )
  return { controller, chatService, creditsService }
}

describe('PublicChatController', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
  })

  it('streams a public chat message through the resolved owner runtime', async () => {
    const supabase = makeSupabase({})
    vi.mocked(createClient).mockReturnValue(supabase as any)
    const { controller, chatService, creditsService } = makeController()
    const res = makeResponse()
    const req = makeRequest()

    await controller.sendMessage(
      {
        visitor_id: 'visitor-123456',
        conversation_id: 'conv-1',
        content: 'Hello',
      },
      req,
      res,
    )

    expect(createClient).toHaveBeenCalledWith(
      'https://supabase.test',
      'anon-key',
      expect.objectContaining({
        global: { headers: { Authorization: 'Bearer owner-token' } },
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    )
    expect(creditsService.assertHasAvailableCredits).toHaveBeenCalledWith('user-1', 'org-1')
    expect(chatService.processMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        conversationId: 'conv-1',
        content: 'Hello',
        agentKey: 'zara',
        userId: 'user-1',
        accessToken: 'owner-token',
        refreshToken: 'refresh-token',
        orgId: 'org-1',
        source: 'public_agent',
        channelUser: {
          platform_id: 'visitor-123456',
          display_name: 'Visitor visitor-',
        },
        timingSpans: [expect.objectContaining({ name: 'public_controller' })],
      }),
    )
    expect(res.write).toHaveBeenCalledWith('data: {"type":"delta","content":"Streamed reply"}\n\n')
    expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n')
    expect(res.end).toHaveBeenCalled()
    expect(req.on).toHaveBeenCalledWith('aborted', expect.any(Function))
    expect(req.on).not.toHaveBeenCalledWith('close', expect.any(Function))
    expect(res.on).toHaveBeenCalledWith('close', expect.any(Function))
  })

  it('does not write after the response stream closes', async () => {
    const supabase = makeSupabase({})
    vi.mocked(createClient).mockReturnValue(supabase as any)
    const { controller } = makeController()
    const res = makeResponse()
    const req = makeRequest()
    res.on.mockImplementation((event: string, handler: () => void) => {
      if (event === 'close') handler()
      return res
    })

    await controller.sendMessage(
      {
        visitor_id: 'visitor-123456',
        conversation_id: 'conv-1',
        content: 'Hello',
      },
      req,
      res,
    )

    expect(res.write).not.toHaveBeenCalled()
    expect(res.end).toHaveBeenCalled()
  })

  it('prewarms public chat context through the resolved owner runtime', async () => {
    const supabase = makeSupabase({})
    vi.mocked(createClient).mockReturnValue(supabase as any)
    const { controller, chatService, creditsService } = makeController()

    const result = await controller.prewarm(
      {
        visitor_id: 'visitor-123456',
        conversation_id: 'conv-1',
      },
      makeRequest(),
    )

    expect(creditsService.assertHasAvailableCredits).toHaveBeenCalledWith('user-1', 'org-1')
    expect(chatService.prewarmChatContext).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        conversationId: 'conv-1',
        agentKey: 'zara',
        userId: 'user-1',
        accessToken: 'owner-token',
        refreshToken: 'refresh-token',
        orgId: 'org-1',
        source: 'public_agent',
      }),
    )
    expect(result).toEqual({
      ok: true,
      cache_key: 'cache-key',
      reused: false,
      cache_status: 'built_on_send',
      store: 'memory',
      duration_ms: 5,
    })
  })

  it('prewarms public agent context before a conversation exists', async () => {
    const supabase = makeSupabase({})
    vi.mocked(createClient).mockReturnValue(supabase as any)
    const { controller, chatService, creditsService } = makeController()

    const result = await controller.prewarmAgent(makeRequest())

    expect(creditsService.assertHasAvailableCredits).toHaveBeenCalledWith('user-1', 'org-1')
    expect(chatService.prewarmAgentChatContext).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        agentKey: 'zara',
        userId: 'user-1',
        accessToken: 'owner-token',
        refreshToken: 'refresh-token',
        orgId: 'org-1',
        source: 'public_agent',
      }),
    )
    expect(result).toEqual({
      ok: true,
      cache_key: 'agent-cache-key',
      reused: false,
      cache_status: 'built_on_send',
      store: 'memory',
      duration_ms: 4,
    })
  })

  it('identifies a visitor and updates the public conversation metadata', async () => {
    const lookupQuery = makeQuery({
      data: { id: 'conv-1', metadata: { existing: true }, user_id: 'user-1' },
      error: null,
    })
    const updateQuery = makeQuery({ error: null })
    vi.mocked(createClient).mockReturnValue(
      makeSupabase({ conversations: [lookupQuery, updateQuery] }) as any,
    )
    vi.mocked(resolveContactViaInternalApi).mockResolvedValue('contact-1')

    const { controller } = makeController()
    const result = await controller.identifyVisitor(
      {
        visitor_id: ' visitor-1 ',
        conversation_id: ' conv-1 ',
        email: 'VISITOR@Example.COM',
        name: 'Grace Hopper',
      },
      makeRequest(),
    )

    expect(resolveContactViaInternalApi).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: 'org-1',
      email: 'visitor@example.com',
      firstName: 'Grace',
      lastName: 'Hopper',
      campaignId: 'campaign-1',
      agentKey: 'zara',
    })
    expect(lookupQuery.eq).toHaveBeenCalledWith('id', 'conv-1')
    expect(updateQuery.update).toHaveBeenCalledWith({
      metadata: {
        existing: true,
        public: true,
        visitor_id: 'visitor-1',
        visitor_email: 'visitor@example.com',
        visitor_name: 'Grace Hopper',
      },
      contact_id: 'contact-1',
      campaign_id: 'campaign-1',
      updated_at: expect.any(String),
    })
    expect(result).toEqual({ linked: true, contact_id: 'contact-1' })
  })
})
