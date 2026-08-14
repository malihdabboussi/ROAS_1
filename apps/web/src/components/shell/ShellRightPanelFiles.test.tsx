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

  it('distinguishes Mission outputs and can show the exact receipt in chat', async () => {
    mocks.fetchConversationDocuments.mockResolvedValue([])
    const scrollIntoView = vi.fn()
    const messages: Message[] = [
      {
        id: 'mission-receipt-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: 'Quick Mission started: Client Strategy — General / Meetings.',
        content_blocks: null,
        metadata: {
          content_blocks_ordered: [
            {
              type: 'artifact_preview',
              id: 'mission-card-1',
              artifactType: 'mission',
              artifactId: 'mission-1',
              name: 'Client Strategy — General / Meetings',
              subtitle: 'Started from this chat',
            },
          ],
        },
        created_at: '2026-08-14T05:00:00.000Z',
      },
    ]

    render(
      <>
        <div
          data-message-id="mission-receipt-1"
          ref={(node) => {
            if (node) node.scrollIntoView = scrollIntoView
          }}
        />
        <ShellRightPanelFiles conversationId="conversation-1" messages={messages} />
      </>,
    )

    expect(await screen.findByText('Client Strategy — General / Meetings')).toBeInTheDocument()
    expect(screen.getByText('Started from this chat')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Output actions for Client Strategy — General / Meetings',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show in chat' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('does not list the same chat file twice when documents and messages overlap', async () => {
    mocks.fetchConversationDocuments.mockResolvedValue([
      {
        id: 'document-image',
        conversation_id: 'conversation-1',
        campaign_id: null,
        resource_id: null,
        document_type: 'image_upload',
        title: 'image.png',
        content: { file_url: 'https://cdn.example.com/image.png' },
        created_at: '2026-08-14T20:00:00.000Z',
        updated_at: '2026-08-14T20:00:00.000Z',
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
              filename: 'image.png',
              type: 'image',
              fileUrl: 'https://cdn.example.com/image.png',
              mimeType: 'image/png',
            },
          ],
        },
        created_at: '2026-08-14T19:00:00.000Z',
      },
    ]

    render(<ShellRightPanelFiles conversationId="conversation-1" messages={messages} />)

    expect(await screen.findAllByText('image.png')).toHaveLength(1)
  })
})
