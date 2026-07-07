import { Profiler, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Conversation } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  useAgentChatSessionLifecycle,
  type UseAgentChatSessionLifecycleInput,
} from './use-agent-chat-session-lifecycle'

function conversation(id: string, overrides: Partial<Conversation> = {}): Conversation {
  return {
    id,
    user_id: 'user-1',
    campaign_id: null,
    title: `Session ${id}`,
    agent_id: 'agent-alpha',
    status: 'active',
    metadata: {},
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:10:00.000Z',
    ...overrides,
  }
}

function createInput(
  overrides: Partial<UseAgentChatSessionLifecycleInput> = {},
): UseAgentChatSessionLifecycleInput {
  return {
    sessions: [],
    selectedSessionId: null,
    fetchMessagesForSession: vi.fn(async () => []),
    deleteConversationById: vi.fn(async () => undefined),
    removeConversation: vi.fn(),
    setSessions: vi.fn(),
    setSelectedSessionId: vi.fn(),
    setActiveConversationId: vi.fn(),
    selectSession: vi.fn(async () => undefined),
    renameConversationById: vi.fn(async () => undefined),
    updateConversation: vi.fn(),
    getConversation: vi.fn(() => undefined),
    onConversationUpdated: vi.fn(),
    ...overrides,
  }
}

function renderLifecycle(input: UseAgentChatSessionLifecycleInput, onRender?: () => void) {
  return renderHook((props: UseAgentChatSessionLifecycleInput) => useAgentChatSessionLifecycle(props), {
    initialProps: input,
    wrapper: ({ children }: { children: ReactNode }) => (
      <Profiler id="agent-chat-session-lifecycle" onRender={onRender ?? (() => undefined)}>
        {children}
      </Profiler>
    ),
  })
}

describe('useAgentChatSessionLifecycle', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('deletes stale empty draft sessions and clears the selected draft without render loops', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0
    let sessions = [
      conversation('draft-conversation', {
        title: 'Draft session',
        metadata: {
          team_draft: true,
          draft_started_at: '2026-06-23T00:00:00.000Z',
        },
      }),
    ]
    const input = createInput({
      sessions,
      selectedSessionId: 'draft-conversation',
      setSessions: vi.fn((next) => {
        sessions = typeof next === 'function' ? next(sessions) : next
      }),
    })

    try {
      renderLifecycle(input, () => commits++)

      await waitFor(() =>
        expect(input.deleteConversationById).toHaveBeenCalledWith('draft-conversation'),
      )

      expect(input.fetchMessagesForSession).toHaveBeenCalledWith('draft-conversation', { limit: 1 })
      expect(input.removeConversation).toHaveBeenCalledWith('draft-conversation')
      expect(input.setSelectedSessionId).toHaveBeenCalledWith(null)
      expect(input.setActiveConversationId).toHaveBeenCalledWith(null)
      expect(input.selectSession).not.toHaveBeenCalled()
      expect(sessions).toEqual([])

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(8)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('reveals and persists generated session titles', async () => {
    vi.useFakeTimers()
    const session = conversation('conversation-1', { title: 'Old title' })
    let sessions = [session]
    const input = createInput({
      sessions,
      getConversation: vi.fn(() => session),
      setSessions: vi.fn((next) => {
        sessions = typeof next === 'function' ? next(sessions) : next
      }),
    })
    const { result } = renderLifecycle(input)

    act(() => {
      result.current.beginSessionTitleReveal('conversation-1', 'Done')
    })

    expect(result.current.sessionTitleTypewriter).toEqual({
      conversationId: 'conversation-1',
      text: '',
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(36)
    })
    expect(result.current.sessionTitleTypewriter?.text).toBe('D')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(36 * 3)
    })

    expect(input.renameConversationById).toHaveBeenCalledWith('conversation-1', 'Done')
    expect(input.updateConversation).toHaveBeenCalledWith('conversation-1', { title: 'Done' })
    expect(input.onConversationUpdated).toHaveBeenCalledWith({ ...session, title: 'Done' })
    expect(sessions[0]?.title).toBe('Done')
  })
})
