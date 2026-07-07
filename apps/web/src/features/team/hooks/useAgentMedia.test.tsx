import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'
import type { Conversation } from '@/lib/conversations/conversation.types'
import { useAgentMedia } from './useAgentMedia'

const mediaApiMocks = vi.hoisted(() => ({
  fetchAgentDocuments: vi.fn(),
  fetchConversations: vi.fn(),
  fetchMessages: vi.fn(),
}))

vi.mock('@/features/studio/services/artifact-preview.service', () => ({
  fetchAgentDocuments: mediaApiMocks.fetchAgentDocuments,
}))

vi.mock('@/features/studio/services/chat.service', () => ({
  fetchConversations: mediaApiMocks.fetchConversations,
  fetchMessages: mediaApiMocks.fetchMessages,
}))

vi.mock('@/lib/artifacts/artifact-preview-api', () => ({
  fetchAgentDocuments: mediaApiMocks.fetchAgentDocuments,
}))

vi.mock('@/lib/conversations/conversations-api', () => ({
  fetchConversations: mediaApiMocks.fetchConversations,
  fetchMessages: mediaApiMocks.fetchMessages,
}))

type MessageFixture = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string | null
  content_blocks: Array<{ id: string; type: 'text'; content: string }> | null
  metadata: Record<string, unknown>
  created_at: string
}

function documentFixture(
  id: string,
  documentType: ConversationDocument['document_type'],
): ConversationDocument {
  return {
    id,
    conversation_id: 'conversation-1',
    campaign_id: 'campaign-1',
    resource_id: null,
    document_type: documentType,
    title: `${documentType} document`,
    content: {},
    metadata: {},
    created_at: '2026-06-22T10:00:00.000Z',
    updated_at: '2026-06-22T10:00:00.000Z',
  }
}

function conversationFixture(id: string): Conversation {
  return {
    id,
    user_id: 'user-1',
    campaign_id: 'campaign-1',
    title: 'Team chat',
    agent_id: 'agent-1',
    status: 'active',
    metadata: {},
    created_at: '2026-06-22T10:00:00.000Z',
    updated_at: '2026-06-22T10:00:00.000Z',
  }
}

function messageFixture(overrides: Partial<MessageFixture>): MessageFixture {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: null,
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-22T10:05:00.000Z',
    ...overrides,
  }
}

describe('useAgentMedia', () => {
  beforeEach(() => {
    mediaApiMocks.fetchAgentDocuments.mockReset()
    mediaApiMocks.fetchConversations.mockReset()
    mediaApiMocks.fetchMessages.mockReset()
  })

  it('loads agent documents and maps loaded conversation messages into media and link rows', async () => {
    mediaApiMocks.fetchAgentDocuments.mockResolvedValue([
      documentFixture('artifact-doc', 'offer'),
      documentFixture('file-doc', 'pdf'),
    ])
    mediaApiMocks.fetchConversations.mockResolvedValue([conversationFixture('conversation-1')])
    mediaApiMocks.fetchMessages.mockResolvedValue([
      messageFixture({
        id: 'message-1',
        content_blocks: [
          {
            id: 'block-1',
            type: 'text',
            content:
              'Review ![Chart](https://cdn.example.com/chart.png) and [Portal](https://example.com/portal).',
          },
        ],
      }),
      messageFixture({
        id: 'message-2',
        role: 'system',
        content: 'https://ignored.example.com',
        created_at: '2026-06-22T10:06:00.000Z',
      }),
    ])

    const { result } = renderHook(() => useAgentMedia('agent-1'))

    await waitFor(() => expect(result.current.docsLoading).toBe(false))
    await waitFor(() => expect(result.current.mediaRows).toHaveLength(1))

    expect(result.current.artifactDocs.map((doc) => doc.id)).toEqual(['artifact-doc'])
    expect(result.current.fileDocs.map((doc) => doc.id)).toEqual(['file-doc'])
    expect(result.current.mediaRows[0]).toMatchObject({
      id: 'message-1:https://cdn.example.com/chart.png',
      kind: 'image',
      url: 'https://cdn.example.com/chart.png',
      label: 'Chart',
      messageId: 'message-1',
      role: 'assistant',
    })
    expect(result.current.linkRows).toEqual([
      expect.objectContaining({
        id: 'message-1:https://example.com/portal',
        url: 'https://example.com/portal',
        title: 'Portal',
        messageId: 'message-1',
        role: 'assistant',
      }),
    ])
    expect(result.current.hasMore).toBe(false)
    expect(mediaApiMocks.fetchConversations).toHaveBeenCalledWith(undefined, 'agent-1')
    expect(mediaApiMocks.fetchMessages).toHaveBeenCalledWith('conversation-1', { limit: 45 })
  })

  it('clears local state and skips API calls without an agent key', async () => {
    const { result } = renderHook(() => useAgentMedia(null))

    await waitFor(() => expect(result.current.docsLoading).toBe(false))

    expect(result.current.artifactDocs).toEqual([])
    expect(result.current.fileDocs).toEqual([])
    expect(result.current.mediaRows).toEqual([])
    expect(result.current.linkRows).toEqual([])
    expect(mediaApiMocks.fetchAgentDocuments).not.toHaveBeenCalled()
    expect(mediaApiMocks.fetchConversations).not.toHaveBeenCalled()
    expect(mediaApiMocks.fetchMessages).not.toHaveBeenCalled()
  })
})
