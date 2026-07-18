import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '@/lib/conversations'
import { ShellRightPanelFiles } from './ShellRightPanelFiles'

const mocks = vi.hoisted(() => ({
  fetchConversationDocuments: vi.fn(),
  openArtifactInShell: vi.fn(),
}))

vi.mock('@/lib/artifacts', () => ({
  fetchConversationDocuments: mocks.fetchConversationDocuments,
  openArtifactInShell: mocks.openArtifactInShell,
}))

describe('ShellRightPanelFiles', () => {
  beforeEach(() => {
    mocks.fetchConversationDocuments.mockReset()
    mocks.openArtifactInShell.mockReset()
  })

  afterEach(cleanup)

  it('combines saved conversation artifacts with files attached in chat', async () => {
    mocks.fetchConversationDocuments.mockResolvedValue([
      {
        id: 'document-1',
        conversation_id: 'conversation-1',
        campaign_id: null,
        resource_id: null,
        document_type: 'upload',
        title: 'Generated proposal',
        content: { file_url: 'https://cdn.example.com/proposal.docx' },
        created_at: '2026-07-17T20:00:00.000Z',
        updated_at: '2026-07-17T20:00:00.000Z',
      },
    ])
    const messages: Message[] = [
      {
        id: 'message-1',
        conversation_id: 'conversation-1',
        role: 'user',
        content: null,
        content_blocks: null,
        metadata: {
          documents: [
            {
              filename: 'Client brief.pdf',
              type: 'text',
              fileUrl: 'https://cdn.example.com/brief.pdf',
              mimeType: 'application/pdf',
            },
          ],
        },
        created_at: '2026-07-17T19:00:00.000Z',
      },
    ]

    render(<ShellRightPanelFiles conversationId="conversation-1" messages={messages} />)

    expect(await screen.findByText('Generated proposal')).toBeInTheDocument()
    expect(screen.getByText('Client brief.pdf')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Generated proposal'))
    expect(mocks.openArtifactInShell).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'document-1', conversationId: 'conversation-1' }),
    )
  })
})
