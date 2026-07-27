import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startOpenAICodexOAuth } from '@/lib/integrations/openai-codex-oauth'
import { resolveChatStreamFailure } from '../../config/chat-stream-errors.config'
import { recoverConversation } from '../../services/chat.service'
import { useChatStore } from '../../store/use-chat-store'
import { StreamInterruptedBar } from './StreamInterruptedBar'

vi.mock('../../services/chat.service', () => ({
  recoverConversation: vi.fn(async () => undefined),
}))

vi.mock('@/lib/integrations/openai-codex-oauth', () => ({
  startOpenAICodexOAuth: vi.fn(async () => true),
}))

describe('StreamInterruptedBar', () => {
  afterEach(() => {
    cleanup()
    useChatStore.setState({
      interruptedConversationIds: [],
      streamingConversationIds: [],
      reconnectingConversationIds: [],
      streamFailureByConversation: {},
    })
    vi.clearAllMocks()
  })

  it('shows one Resume action for interrupted streams', () => {
    useChatStore.setState({
      interruptedConversationIds: ['conversation-1'],
      streamingConversationIds: [],
      reconnectingConversationIds: [],
      streamFailureByConversation: {
        'conversation-1': resolveChatStreamFailure({ code: 'stream_interrupted' }),
      },
    })

    render(<StreamInterruptedBar conversationId="conversation-1" />)

    const resumeButton = screen.getByRole('button', { name: /resume/i })
    fireEvent.click(resumeButton)

    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull()
    expect(recoverConversation).toHaveBeenCalledWith('conversation-1')
  })

  it('clears the interrupted flow when Resume cannot recover', async () => {
    vi.mocked(recoverConversation).mockRejectedValueOnce(new Error('resume failed'))
    useChatStore.setState({
      interruptedConversationIds: ['conversation-1'],
      streamingConversationIds: [],
      reconnectingConversationIds: [],
      streamRunsByConversation: {
        'conversation-1': {
          runId: 'run-1',
          messageId: 'message-1',
          cursor: '2-0',
          updatedAt: Date.now(),
        },
      },
      streamFailureByConversation: {
        'conversation-1': resolveChatStreamFailure({ code: 'stream_interrupted' }),
      },
    })

    render(<StreamInterruptedBar conversationId="conversation-1" />)
    fireEvent.click(screen.getByRole('button', { name: /resume/i }))

    await waitFor(() => {
      expect(useChatStore.getState().interruptedConversationIds).not.toContain('conversation-1')
    })
    expect(useChatStore.getState().streamFailureByConversation['conversation-1']).toBeUndefined()
    expect(useChatStore.getState().streamRunsByConversation['conversation-1']).toBeUndefined()
  })

  it('keeps context-limit Resume available when continue fails', async () => {
    vi.mocked(recoverConversation).mockRejectedValueOnce(new Error('continue failed'))
    useChatStore.setState({
      interruptedConversationIds: ['conversation-1'],
      streamingConversationIds: [],
      reconnectingConversationIds: [],
      streamFailureByConversation: {
        'conversation-1': resolveChatStreamFailure({ code: 'context_window_exceeded' }),
      },
    })

    render(<StreamInterruptedBar conversationId="conversation-1" />)
    fireEvent.click(screen.getByRole('button', { name: /resume/i }))

    await waitFor(() => {
      expect(recoverConversation).toHaveBeenCalledWith('conversation-1')
    })
    expect(useChatStore.getState().interruptedConversationIds).toContain('conversation-1')
    expect(useChatStore.getState().streamFailureByConversation['conversation-1']?.code).toBe(
      'context_window_exceeded',
    )
  })

  it('starts OpenAI Codex OAuth for reconnect-required failures', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    useChatStore.setState({
      interruptedConversationIds: ['conversation-1'],
      streamingConversationIds: [],
      reconnectingConversationIds: [],
      streamFailureByConversation: {
        'conversation-1': resolveChatStreamFailure({ code: 'reconnect_required' }),
      },
    })

    render(<StreamInterruptedBar conversationId="conversation-1" />)
    fireEvent.click(screen.getByRole('button', { name: /reconnect/i }))

    await waitFor(() => {
      expect(startOpenAICodexOAuth).toHaveBeenCalled()
    })
    expect(recoverConversation).not.toHaveBeenCalled()
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'open-account-settings', detail: 'integrations' }),
    )
  })
})
