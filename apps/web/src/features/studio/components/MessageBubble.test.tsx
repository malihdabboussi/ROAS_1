import { Profiler } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VoiceApprovalProvider } from '@/components/chat/VoiceApprovalContext'
import { MessageBubble } from './MessageBubble'

const mockStore = {
  activeConversationId: 'conversation-1',
  appendUiBlockToOrderedBlocks: vi.fn(),
  conversationStreamUI: {},
  imageGeneratedEvents: [],
  reconnectingConversationIds: [],
  setOrderedBlocks: vi.fn(),
  streamingMessageIdsByConversation: {},
}

vi.mock('../store/use-chat-store', () => ({
  useChatStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}))

vi.mock('../services/chat.service', () => ({
  patchMessageMetadata: vi.fn(),
  sendMessageStreaming: vi.fn(),
}))

vi.mock('./chat/ChatAttachmentPreviews', () => ({
  ChatAttachmentPreviews: () => <div data-testid="attachment-previews" />,
}))

vi.mock('./chat/InlineImageGen', () => ({
  GeneratedAudio: ({ url }: { url: string }) => <div>audio:{url}</div>,
  GeneratedImage: ({ url }: { url: string }) => <div>image:{url}</div>,
  GeneratedVideo: ({ url }: { url: string }) => <div>video:{url}</div>,
}))

vi.mock('./chat/StatusIndicator', () => ({
  PersistedFlowTimeline: () => <div>persisted flow</div>,
  PersistedToolSteps: ({ steps }: { steps: string[] }) => <div>steps:{steps.join(',')}</div>,
}))

vi.mock('./message-bubble/AssistantActions', () => ({
  AssistantActions: ({ conversationId }: { conversationId?: string }) => (
    <div data-testid="assistant-actions">actions:{conversationId}</div>
  ),
}))

vi.mock('./message-bubble/MarkdownContent', () => ({
  MarkdownContent: ({ content }: { content: string }) => <p>{content}</p>,
}))

vi.mock('./message-bubble/UserMessageBubble', () => ({
  UserMessageBubble: () => <div>user bubble</div>,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MessageBubble', () => {
  it('renders an assistant text message inside the shared voice approval provider without churn', () => {
    let commitCount = 0

    render(
      <Profiler id="message-bubble" onRender={() => commitCount++}>
        <VoiceApprovalProvider value={vi.fn()}>
          <MessageBubble
            message={
              {
                id: 'message-1',
                role: 'assistant',
                content: 'Ready to help',
                conversation_id: 'conversation-1',
                created_at: '2026-06-23T00:00:00Z',
                metadata: {},
              } as never
            }
          />
        </VoiceApprovalProvider>
      </Profiler>,
    )

    expect(screen.queryByText('Ready to help')).not.toBeNull()
    expect(screen.queryByTestId('assistant-actions')?.textContent).toBe('actions:conversation-1')
    expect(commitCount).toBeLessThan(6)
  })
})
