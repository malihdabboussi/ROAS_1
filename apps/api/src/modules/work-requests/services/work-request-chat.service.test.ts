import { ConflictException, GoneException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkRequestChatService } from './work-request-chat.service'

const TOKEN = 'safe-token-abcdefghijklmnopqrstuvwxyz0123456789'
const CONVERSATION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const OWNER_ID = 'owner-1'
const DRAFT_ID = 'draft-1'

function makeDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: DRAFT_ID,
    owner_user_id: OWNER_ID,
    owner_org_id: 'org-1',
    status: 'draft',
    review_token_expires_at: new Date(Date.now() + 60_000).toISOString(),
    review_token_revoked_at: null,
    provenance: { conversation_id: CONVERSATION_ID },
    requester_metadata: { name: 'Alex Reviewer' },
    ...overrides,
  }
}

describe('WorkRequestChatService', () => {
  const repository = {
    client: {
      from: vi.fn(),
    },
    findByTokenHash: vi.fn(),
    update: vi.fn(),
  }
  const userSessionMint = { mintAccessToken: vi.fn() }
  const userAgentApi = { invoke: vi.fn() }
  let service: WorkRequestChatService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new WorkRequestChatService(
      repository as never,
      userSessionMint as never,
      userAgentApi as never,
    )
  })

  it('loads owned conversation messages for an active review token', async () => {
    repository.findByTokenHash.mockResolvedValue(makeDraft())
    const conversationQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: CONVERSATION_ID }, error: null }),
    }
    const messagesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'm2',
            conversation_id: CONVERSATION_ID,
            role: 'assistant',
            content: 'second',
            metadata: {},
            created_at: '2026-08-17T01:00:00.000Z',
          },
          {
            id: 'm1',
            conversation_id: CONVERSATION_ID,
            role: 'user',
            content: 'first',
            metadata: {},
            created_at: '2026-08-17T00:00:00.000Z',
          },
        ],
        error: null,
      }),
    }
    repository.client.from.mockImplementation((table: string) => {
      if (table === 'conversations') return conversationQuery
      if (table === 'messages') return messagesQuery
      throw new Error(`unexpected table ${table}`)
    })

    await expect(service.getReviewChat(TOKEN)).resolves.toEqual({
      conversation_id: CONVERSATION_ID,
      messages: [
        expect.objectContaining({ id: 'm1', content: 'first' }),
        expect.objectContaining({ id: 'm2', content: 'second' }),
      ],
    })
  })

  it('rejects finalized review chat access', async () => {
    repository.findByTokenHash.mockResolvedValue(makeDraft({ status: 'finalized' }))
    await expect(service.getReviewChat(TOKEN)).rejects.toBeInstanceOf(ConflictException)
  })

  it('rejects expired review chat access', async () => {
    repository.findByTokenHash.mockResolvedValue(
      makeDraft({
        review_token_expires_at: new Date(Date.now() - 1_000).toISOString(),
      }),
    )
    repository.update.mockResolvedValue(makeDraft({ status: 'expired' }))
    await expect(service.getReviewChat(TOKEN)).rejects.toBeInstanceOf(GoneException)
  })

  it('rejects when provenance has no conversation id', async () => {
    repository.findByTokenHash.mockResolvedValue(makeDraft({ provenance: {} }))
    await expect(service.getReviewChat(TOKEN)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('backfills conversation from slack provenance before loading chat', async () => {
    repository.findByTokenHash.mockResolvedValue(
      makeDraft({ provenance: { channel_id: 'C123', thread_ts: '123.456' } }),
    )
    repository.update.mockResolvedValue(
      makeDraft({
        provenance: {
          channel_id: 'C123',
          thread_ts: '123.456',
          conversation_id: CONVERSATION_ID,
        },
      }),
    )
    const slackChain: {
      eq: ReturnType<typeof vi.fn>
      is: ReturnType<typeof vi.fn>
      limit: ReturnType<typeof vi.fn>
    } = {
      eq: vi.fn(() => slackChain),
      is: vi.fn(() => slackChain),
      limit: vi.fn().mockResolvedValue({ data: [{ id: CONVERSATION_ID }], error: null }),
    }
    const conversationQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: CONVERSATION_ID }, error: null }),
    }
    const messagesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    let conversationCalls = 0
    repository.client.from.mockImplementation((table: string) => {
      if (table === 'messages') return messagesQuery
      if (table !== 'conversations') throw new Error(`unexpected table ${table}`)
      conversationCalls += 1
      if (conversationCalls === 1) {
        return { select: vi.fn(() => slackChain) }
      }
      return conversationQuery
    })

    await expect(service.getReviewChat(TOKEN)).resolves.toEqual({
      conversation_id: CONVERSATION_ID,
      messages: [],
    })
    expect(repository.update).toHaveBeenCalled()
  })
})
