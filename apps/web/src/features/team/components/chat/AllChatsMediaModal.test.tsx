import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { AllChatsMediaModal } from './AllChatsMediaModal'

const modalApiMocks = vi.hoisted(() => ({
  conversationDocumentToPendingArtifact: vi.fn(),
  fetchConversationAssets: vi.fn(),
  openStudioArtifactInNewTab: vi.fn(),
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div>{text ?? 'Loading'}</div>,
}))

vi.mock('@/features/studio/lib/conversation-document-to-pending-artifact', () => ({
  conversationDocumentToPendingArtifact: modalApiMocks.conversationDocumentToPendingArtifact,
}))

vi.mock('@/lib/artifacts/conversation-document-to-pending-artifact', () => ({
  conversationDocumentToPendingArtifact: modalApiMocks.conversationDocumentToPendingArtifact,
}))

vi.mock('@/features/studio/lib/open-studio-artifact', () => ({
  openStudioArtifactInNewTab: modalApiMocks.openStudioArtifactInNewTab,
}))

vi.mock('@/lib/artifacts/open-studio-artifact', () => ({
  openStudioArtifactInNewTab: modalApiMocks.openStudioArtifactInNewTab,
}))

vi.mock('@/features/studio/services/chat.service', () => ({
  fetchConversationAssets: modalApiMocks.fetchConversationAssets,
}))

vi.mock('@/lib/conversations/conversations-api', () => ({
  fetchConversationAssets: modalApiMocks.fetchConversationAssets,
}))

vi.mock('@/features/team/components/chat/ConversationArtifactPreviewCard', () => ({
  ConversationArtifactPreviewCard: ({
    doc,
    contextLine,
    onOpen,
  }: {
    doc: { title: string | null }
    contextLine?: string | null
    onOpen?: () => void
  }) => (
    <button type="button" onClick={onOpen}>
      {doc.title}
      {contextLine ? ` ${contextLine}` : ''}
    </button>
  ),
}))

vi.mock('@/features/team/components/chat/ChatMediaTile', () => ({
  ChatMediaTile: ({ url }: { url: string }) => <span>{url}</span>,
}))

const agents: MissionAgent[] = [
  {
    id: 'agent-row-1',
    user_id: 'user-1',
    agent_key: 'agent-1',
    name: 'Ari',
    role: 'Designer',
    status: 'online',
    skills: [],
    image_url: null,
    created_at: '2026-06-22T10:00:00.000Z',
    updated_at: '2026-06-22T10:00:00.000Z',
  },
]

describe('AllChatsMediaModal', () => {
  beforeEach(() => {
    modalApiMocks.conversationDocumentToPendingArtifact.mockReset()
    modalApiMocks.fetchConversationAssets.mockReset()
    modalApiMocks.openStudioArtifactInNewTab.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('loads link feed rows and navigates back to the source message', async () => {
    const onNavigateToConversation = vi.fn()
    modalApiMocks.fetchConversationAssets.mockResolvedValue({
      items: [
        {
          id: 'link-1',
          scope: 'links',
          created_at: '2026-06-22T10:05:00.000Z',
          conversation_id: 'conversation-1',
          conversation_title: 'Launch chat',
          agent_id: 'agent-1',
          message_id: 'message-1',
          message_snippet: 'Open the research portal',
          url: 'https://example.com/research',
          title: 'Research portal',
        },
      ],
      nextCursor: null,
    })

    render(
      <AllChatsMediaModal
        open
        onOpenChange={vi.fn()}
        initialScope="links"
        agents={agents}
        onNavigateToConversation={onNavigateToConversation}
      />,
    )

    expect(await screen.findByText('Research portal')).toBeTruthy()
    fireEvent.click(screen.getByText('Open the research portal'))

    expect(modalApiMocks.fetchConversationAssets).toHaveBeenCalledWith('links', {
      limit: 50,
      before: undefined,
    })
    expect(onNavigateToConversation).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      messageId: 'message-1',
      agentKey: 'agent-1',
    })
  })

  it('opens campaign artifacts through the studio bootstrap payload', async () => {
    const onOpenChange = vi.fn()
    modalApiMocks.conversationDocumentToPendingArtifact.mockReturnValue({
      kind: 'simple',
      type: 'offer',
      id: 'offer-1',
      name: 'Offer doc',
    })
    modalApiMocks.fetchConversationAssets.mockResolvedValue({
      items: [
        {
          id: 'doc-1',
          scope: 'artifacts',
          created_at: '2026-06-22T10:05:00.000Z',
          conversation_id: 'conversation-1',
          conversation_title: 'Launch chat',
          agent_id: 'agent-1',
          document: {
            id: 'doc-1',
            conversation_id: 'conversation-1',
            campaign_id: 'campaign-1',
            resource_id: 'offer-1',
            document_type: 'offer',
            title: 'Offer doc',
            content: {},
            created_at: '2026-06-22T10:05:00.000Z',
            updated_at: '2026-06-22T10:05:00.000Z',
          },
        },
      ],
      nextCursor: null,
    })

    render(
      <AllChatsMediaModal
        open
        onOpenChange={onOpenChange}
        initialScope="artifacts"
        agents={agents}
        onNavigateToConversation={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByText(/Offer doc/))

    await waitFor(() => {
      expect(modalApiMocks.openStudioArtifactInNewTab).toHaveBeenCalledWith({
        campaignId: 'campaign-1',
        pending: { kind: 'simple', type: 'offer', id: 'offer-1', name: 'Offer doc' },
      })
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
