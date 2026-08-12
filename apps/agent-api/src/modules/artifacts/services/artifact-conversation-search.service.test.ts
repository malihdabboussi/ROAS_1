import { describe, expect, it, vi } from 'vitest'
import { ArtifactConversationSearchService } from './artifact-conversation-search.service'

describe('ArtifactConversationSearchService', () => {
  it('searches only through the resolved user and org scope and returns bounded excerpts', async () => {
    const repository = {
      search: vi.fn(async () => ({
        conversations: [
          {
            id: 'conversation-1',
            title: 'Wholesale Universe Brand Reputation',
            agent_id: 'pixel',
            campaign_id: null,
            updated_at: '2026-08-10T10:00:00.000Z',
            summary: 'Brand reputation review',
          },
        ],
        messages: [
          {
            conversation_id: 'conversation-1',
            role: 'assistant',
            content: 'A'.repeat(700),
            created_at: '2026-08-10T10:02:00.000Z',
          },
          {
            conversation_id: 'conversation-1',
            role: 'user',
            content: 'Review the brand reputation.',
            created_at: '2026-08-10T10:01:00.000Z',
          },
        ],
      })),
    }
    const service = new ArtifactConversationSearchService(repository as never)
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      getUserClient: vi.fn(async () => ({ client: true })),
    }

    const result = await service.getHandlers(target).search_conversations(
      { query: 'wholesale universe', limit: 100 },
      'session-key',
    )

    expect(repository.search).toHaveBeenCalledWith(
      { client: true },
      { userId: 'user-1', orgId: 'org-1', query: 'wholesale universe', limit: 20 },
    )
    expect(result).toMatchObject({ success: true, count: 1 })
    expect((result as any).conversations[0].recent_messages[1].content).toHaveLength(500)
  })
})
