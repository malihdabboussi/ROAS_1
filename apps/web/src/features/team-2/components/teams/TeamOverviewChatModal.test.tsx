import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamOverviewChatModal } from './TeamOverviewChatModal'

const mocks = vi.hoisted(() => ({
  fetchMessages: vi.fn(),
  messageBubble: vi.fn(
    ({
      message,
      conversationIdOverride,
      agentKey,
    }: {
      message: { id: string; content: string | null }
      conversationIdOverride?: string | null
      agentKey?: string
    }) => (
      <div data-testid="message-bubble">
        {message.id}:{message.content}:{conversationIdOverride}:{agentKey}
      </div>
    ),
  ),
}))

vi.mock('@/lib/chat/studio-chat-runtime-adapter', () => ({
  fetchMessages: mocks.fetchMessages,
}))

vi.mock('@/components/chat/MessageBubbleAdapter', () => ({
  MessageBubble: mocks.messageBubble,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div data-testid="loading-orb">{text}</div>,
}))

function buildMessage(id: string, metadata: Record<string, unknown> = {}) {
  return {
    id,
    conversation_id: 'conversation-1',
    role: 'assistant' as const,
    content: `Message ${id}`,
    content_blocks: null,
    metadata,
    created_at: '2026-06-23T12:00:00.000Z',
  }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('TeamOverviewChatModal', () => {
  beforeEach(() => {
    mocks.fetchMessages.mockResolvedValue([
      buildMessage('visible-1'),
      buildMessage('hidden-1', { hidden: true }),
      buildMessage('delegation-1', { delegation_task: true }),
    ])
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('loads visible conversation messages, passes chat props, closes, and settles without render loops', async () => {
    const onClose = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0

    try {
      render(
        <Profiler id="team-overview-chat-modal" onRender={() => commits++}>
          <TeamOverviewChatModal
            open
            onClose={onClose}
            conversationId="conversation-1"
            conversationTitle="Product chat"
            agent={{
              id: 'agent-row-1',
              agent_key: 'agent-1',
              name: 'Atlas',
              role: 'Research',
              status: 'working',
              image_url: null,
              updated_at: '2026-06-23T11:50:00.000Z',
            }}
          />
        </Profiler>,
      )

      expect(screen.getAllByText('Product chat')).toHaveLength(2)
      expect(screen.getByText('Atlas · Research')).toBeTruthy()
      expect(screen.getByTestId('loading-orb').textContent).toContain('Loading chat')

      await waitFor(() => expect(mocks.fetchMessages).toHaveBeenCalledWith('conversation-1'))
      await flushAsyncWork()

      expect(screen.getAllByTestId('message-bubble')).toHaveLength(1)
      expect(screen.getByText('visible-1:Message visible-1:conversation-1:agent-1')).toBeTruthy()
      expect(screen.queryByText(/hidden-1/)).toBeNull()
      expect(screen.queryByText(/delegation-1/)).toBeNull()

      fireEvent.click(screen.getByLabelText('Close'))
      expect(onClose).toHaveBeenCalledTimes(1)

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(10)
    } finally {
      consoleError.mockRestore()
    }
  })
})
