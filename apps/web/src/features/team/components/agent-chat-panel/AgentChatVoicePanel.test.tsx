import { Profiler } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents'
import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  AgentChatVoicePanel,
  VOICE_MESSAGES_REFRESH_DELAY_MS,
} from './AgentChatVoicePanel'

const mocks = vi.hoisted(() => {
  const store = {
    messagesByConversation: {} as Record<string, Message[]>,
    setMessages: vi.fn(),
  }

  return {
    fetchMessages: vi.fn(),
    mergeMessagesPreservingOrderedBlocks: vi.fn(),
    store,
  }
})

vi.mock('../voice/AgentVoiceMode', () => ({
  AgentVoiceMode: ({
    agent,
    conversationId,
    onEnd,
  }: {
    agent: MissionAgent
    conversationId: string | null
    onEnd: () => void
  }) => (
    <div data-testid="agent-voice-mode">
      <span>{agent.name}</span>
      <span>{conversationId}</span>
      <button type="button" onClick={onEnd}>
        End voice
      </button>
    </div>
  ),
}))

vi.mock('@/lib/chat/studio-chat-runtime-adapter', () => ({
  fetchMessages: mocks.fetchMessages,
  mergeMessagesPreservingOrderedBlocks: mocks.mergeMessagesPreservingOrderedBlocks,
  useChatStore: {
    getState: () => mocks.store,
  },
}))

function buildAgent(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'agent-row-1',
    user_id: 'user-1',
    agent_key: 'agent-alpha',
    name: 'Agent Alpha',
    role: 'Operations',
    status: 'online',
    skills: [],
    image_url: null,
    is_active: true,
    sync_status: 'ready',
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: 'Hello',
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

describe('AgentChatVoicePanel', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
    mocks.store.messagesByConversation = {}
  })

  it('calls the voice end handler and refreshes conversation messages after the voice delay', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0
    const onEnd = vi.fn()
    const localMessages = [buildMessage({ id: 'local-message' })]
    const latestMessages = [buildMessage({ id: 'latest-message' })]
    const mergedMessages = [...localMessages, ...latestMessages]
    mocks.store.messagesByConversation['conversation-1'] = localMessages
    mocks.fetchMessages.mockResolvedValue(latestMessages)
    mocks.mergeMessagesPreservingOrderedBlocks.mockReturnValue(mergedMessages)
    vi.useFakeTimers()

    try {
      render(
        <Profiler id="agent-chat-voice-panel" onRender={() => commits++}>
          <AgentChatVoicePanel
            agent={buildAgent()}
            conversationId="conversation-1"
            onEnd={onEnd}
          />
        </Profiler>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'End voice' }))

      expect(onEnd).toHaveBeenCalledTimes(1)
      expect(mocks.fetchMessages).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(VOICE_MESSAGES_REFRESH_DELAY_MS)
      })

      expect(mocks.fetchMessages).toHaveBeenCalledWith('conversation-1')
      expect(mocks.mergeMessagesPreservingOrderedBlocks).toHaveBeenCalledWith(
        localMessages,
        latestMessages,
      )
      expect(mocks.store.setMessages).toHaveBeenCalledWith('conversation-1', mergedMessages)
      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(10)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('ends voice mode without scheduling a message refresh when no conversation is selected', () => {
    const onEnd = vi.fn()

    render(<AgentChatVoicePanel agent={buildAgent()} conversationId={null} onEnd={onEnd} />)

    fireEvent.click(screen.getByRole('button', { name: 'End voice' }))

    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(mocks.fetchMessages).not.toHaveBeenCalled()
    expect(mocks.store.setMessages).not.toHaveBeenCalled()
  })
})
