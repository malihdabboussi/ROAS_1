import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'
import type { Message } from '@/lib/conversations/conversation.types'
import { useConversationMedia } from './useConversationMedia'

const conversationMediaApiMocks = vi.hoisted(() => ({
  fetchConversationDocuments: vi.fn(),
}))

vi.mock('@/features/studio/services/artifact-preview.service', () => ({
  fetchConversationDocuments: conversationMediaApiMocks.fetchConversationDocuments,
}))

vi.mock('@/lib/artifacts/artifact-preview-api', () => ({
  fetchConversationDocuments: conversationMediaApiMocks.fetchConversationDocuments,
}))

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

function messageFixture(overrides: Partial<Message>): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: null,
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-22T10:00:00.000Z',
    ...overrides,
  }
}

describe('useConversationMedia', () => {
  beforeEach(() => {
    conversationMediaApiMocks.fetchConversationDocuments.mockReset()
  })

  it('loads conversation documents and maps current messages into sorted media and link rows', async () => {
    conversationMediaApiMocks.fetchConversationDocuments.mockResolvedValue([
      documentFixture('artifact-doc', 'presentation'),
      documentFixture('file-doc', 'pdf'),
    ])

    const messages = [
      messageFixture({
        id: 'older-message',
        role: 'user',
        content: 'Plain link [Docs](https://example.com/docs).',
        created_at: '2026-06-22T10:00:00.000Z',
      }),
      messageFixture({
        id: 'newer-message',
        content_blocks: [
          {
            id: 'block-1',
            type: 'text',
            content:
              'Preview ![Hero](https://cdn.example.com/hero.png) and https://example.com/raw.',
          },
        ],
        created_at: '2026-06-22T10:05:00.000Z',
      }),
      messageFixture({
        id: 'system-message',
        role: 'system',
        content: 'https://ignored.example.com',
        created_at: '2026-06-22T10:10:00.000Z',
      }),
    ]

    const { result } = renderHook(() => useConversationMedia('conversation-1', messages))

    await waitFor(() => expect(result.current.docsLoading).toBe(false))

    expect(result.current.artifactDocs.map((doc) => doc.id)).toEqual(['artifact-doc'])
    expect(result.current.fileDocs.map((doc) => doc.id)).toEqual(['file-doc'])
    expect(result.current.mediaRows).toEqual([
      expect.objectContaining({
        id: 'newer-message:https://cdn.example.com/hero.png',
        kind: 'image',
        url: 'https://cdn.example.com/hero.png',
        label: 'Hero',
        messageId: 'newer-message',
        role: 'assistant',
      }),
    ])
    expect(result.current.linkRows.map((row) => row.id)).toEqual([
      'newer-message:https://example.com/raw.',
      'older-message:https://example.com/docs',
    ])
    expect(conversationMediaApiMocks.fetchConversationDocuments).toHaveBeenCalledWith(
      'conversation-1',
    )
  })

  it('clears documents and skips loading without a conversation id', async () => {
    const { result } = renderHook(() => useConversationMedia(null, []))

    await waitFor(() => expect(result.current.docsLoading).toBe(false))

    expect(result.current.documents).toEqual([])
    expect(result.current.artifactDocs).toEqual([])
    expect(result.current.fileDocs).toEqual([])
    expect(result.current.mediaRows).toEqual([])
    expect(result.current.linkRows).toEqual([])
    expect(conversationMediaApiMocks.fetchConversationDocuments).not.toHaveBeenCalled()
  })
})
