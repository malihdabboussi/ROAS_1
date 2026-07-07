import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChatRenderMessage } from '@/lib/chat/chat-render-message'
import { ChatTurnChangeDivider } from './ChatTurnChangeDivider'

function userMessage(id: string, modelId: string): ChatRenderMessage {
  return {
    id,
    conversation_id: 'conversation-1',
    role: 'user',
    content: 'Hello',
    content_blocks: null,
    metadata: { model_id: modelId },
    model_id: modelId,
    created_at: '2026-06-04T10:00:00.000Z',
  }
}

describe('ChatTurnChangeDivider', () => {
  it('renders nothing when there is no previous user message', () => {
    const { container } = render(
      <ChatTurnChangeDivider userMessage={userMessage('user-1', 'auto')} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders a model change chip between user turns', () => {
    render(
      <ChatTurnChangeDivider
        previousUserMessage={userMessage('user-1', 'auto')}
        userMessage={userMessage('user-2', 'auto:power')}
      />,
    )

    expect(screen.queryByLabelText('Conversation change')).not.toBeNull()
    expect(screen.queryByText('Changed model to Power')).not.toBeNull()
  })
})
