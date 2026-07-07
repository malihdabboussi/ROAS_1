import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveContactViaInternalApi } from './contact-resolution.util'
import { PublicConversationsController } from './controllers/public-conversations.controller'
import { PublicAgentRepository } from './repositories/public-agent.repository'
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
    or: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then(
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
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

function makeController() {
  const publicAgentService = new PublicAgentService(
    new PublicAgentRepository({ client: {} } as any),
  )
  vi.spyOn(publicAgentService, 'resolveOwnerContext').mockResolvedValue({
    accessToken: 'owner-token',
    refreshToken: 'refresh-token',
    orgId: 'org-1',
    actingUserId: 'user-1',
  })
  return new PublicConversationsController(publicAgentService)
}

function makeRequest(widgetCampaignId: string | null = 'campaign-1') {
  return {
    publicAgent: {
      userId: 'user-1',
      orgId: 'org-1',
      agentKey: 'zara',
      widgetCampaignId,
    },
  } as any
}

describe('PublicConversationsController', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
  })

  it('creates a public conversation with normalized visitor identity and contact link', async () => {
    const insertQuery = makeQuery({
      data: { id: 'conv-1', created_at: '2026-06-19T00:00:00.000Z' },
      error: null,
    })
    vi.mocked(createClient).mockReturnValue(makeSupabase({ conversations: insertQuery }) as any)
    vi.mocked(resolveContactViaInternalApi).mockResolvedValue('contact-1')

    const result = await makeController().createConversation(
      {
        visitor_id: 'visitor-1',
        agent_key: 'ignored-client-agent',
        email: 'VISITOR@Example.COM',
        name: 'Ada Lovelace',
      },
      makeRequest(),
    )

    expect(resolveContactViaInternalApi).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: 'org-1',
      email: 'visitor@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      campaignId: 'campaign-1',
      agentKey: 'zara',
    })
    expect(insertQuery.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      agent_id: 'zara',
      title: 'Public chat',
      status: 'active',
      metadata: {
        public: true,
        visitor_id: 'visitor-1',
        visitor_email: 'visitor@example.com',
        visitor_name: 'Ada Lovelace',
      },
      contact_id: 'contact-1',
      campaign_id: 'campaign-1',
      org_id: 'org-1',
    })
    expect(result).toEqual({
      conversation: { id: 'conv-1', created_at: '2026-06-19T00:00:00.000Z' },
      contact_id: 'contact-1',
    })
  })

  it('lists conversations with latest message previews', async () => {
    const conversationsQuery = makeQuery({
      data: [
        {
          id: 'conv-1',
          title: 'First',
          created_at: '2026-06-19T00:00:00.000Z',
          updated_at: '2026-06-19T00:02:00.000Z',
          contact_id: 'contact-1',
        },
      ],
      error: null,
    })
    const previewsQuery = makeQuery({
      data: [
        {
          conversation_id: 'conv-1',
          content: 'Latest reply',
          created_at: '2026-06-19T00:03:00.000Z',
        },
        {
          conversation_id: 'conv-1',
          content: 'Older reply',
          created_at: '2026-06-19T00:01:00.000Z',
        },
      ],
      error: null,
    })
    vi.mocked(createClient).mockReturnValue(
      makeSupabase({ conversations: conversationsQuery, messages: previewsQuery }) as any,
    )

    const result = await makeController().listConversations(
      'visitor-1',
      'VISITOR@Example.COM',
      makeRequest(),
    )

    expect(conversationsQuery.or).toHaveBeenCalledWith(
      'metadata->>visitor_id.eq.visitor-1,metadata->>visitor_email.eq.visitor@example.com',
    )
    expect(previewsQuery.in).toHaveBeenCalledWith('conversation_id', ['conv-1'])
    expect(result).toEqual({
      conversations: [
        {
          id: 'conv-1',
          title: 'First',
          created_at: '2026-06-19T00:00:00.000Z',
          updated_at: '2026-06-19T00:02:00.000Z',
          last_preview: 'Latest reply',
          last_activity_at: '2026-06-19T00:03:00.000Z',
          contact_id: 'contact-1',
        },
      ],
    })
  })

  it('renames only conversations owned by the same visitor', async () => {
    const lookupQuery = makeQuery({
      data: { id: 'conv-1', metadata: { visitor_id: 'visitor-1' } },
      error: null,
    })
    const updateQuery = makeQuery({ error: null })
    vi.mocked(createClient).mockReturnValue(
      makeSupabase({ conversations: [lookupQuery, updateQuery] }) as any,
    )

    const result = await makeController().renameConversation(
      'conv-1',
      { visitor_id: 'visitor-1', title: 'New title' },
      makeRequest(),
    )

    expect(lookupQuery.maybeSingle).toHaveBeenCalled()
    expect(updateQuery.update).toHaveBeenCalledWith({
      title: 'New title',
      updated_at: expect.any(String),
    })
    expect(result).toEqual({ ok: true, title: 'New title' })
  })

  it('returns messages in ascending order for a public conversation', async () => {
    const messagesQuery = makeQuery({
      data: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          metadata: null,
          created_at: '2026-06-19T00:00:00.000Z',
        },
      ],
      error: null,
    })
    vi.mocked(createClient).mockReturnValue(makeSupabase({ messages: messagesQuery }) as any)

    const result = await makeController().getMessages('conv-1', makeRequest())

    expect(messagesQuery.eq).toHaveBeenCalledWith('conversation_id', 'conv-1')
    expect(messagesQuery.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(result).toEqual({
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          metadata: null,
          created_at: '2026-06-19T00:00:00.000Z',
        },
      ],
    })
  })
})
