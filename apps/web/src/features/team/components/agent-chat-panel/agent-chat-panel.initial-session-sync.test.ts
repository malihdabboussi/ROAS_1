import { describe, expect, it, vi } from 'vitest'
import type { Conversation } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  runAgentChatInitialSessionSyncRetry,
  type RunAgentChatInitialSessionSyncRetryInput,
} from './agent-chat-panel.initial-session-sync'

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
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

function createInput(
  overrides: Partial<RunAgentChatInitialSessionSyncRetryInput> = {},
): RunAgentChatInitialSessionSyncRetryInput {
  return {
    agentKey: 'agent-alpha',
    initialSessionId: 'target-session',
    knownSessionsCount: 1,
    fetchConversationsForAgent: vi.fn(async () => [conversation('target-session')]),
    setSessions: vi.fn(),
    selectSession: vi.fn(async () => {}),
    reportMark: vi.fn(),
    wait: vi.fn(async () => {}),
    isCancelled: vi.fn(() => false),
    ...overrides,
  }
}

describe('runAgentChatInitialSessionSyncRetry', () => {
  it('retries after an error and selects the target session when it appears', async () => {
    const target = conversation('target-session')
    const input = createInput({
      fetchConversationsForAgent: vi
        .fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce([conversation('other-session'), target]),
    })

    const status = await runAgentChatInitialSessionSyncRetry(input)

    expect(status).toBe('found')
    expect(input.reportMark).toHaveBeenCalledWith('initial_session_sync_start', {
      known_sessions: 1,
    })
    expect(input.reportMark).toHaveBeenCalledWith('initial_session_sync_attempt_error', {
      attempt: 1,
      message: 'network down',
    })
    expect(input.wait).toHaveBeenCalledWith(500)
    expect(input.fetchConversationsForAgent).toHaveBeenCalledTimes(2)
    expect(input.fetchConversationsForAgent).toHaveBeenCalledWith('agent-alpha')
    expect(input.setSessions).toHaveBeenCalledWith([conversation('other-session'), target])
    expect(input.reportMark).toHaveBeenCalledWith('initial_session_sync_found', {
      attempt: 2,
      sessions_count: 2,
    })
    expect(input.selectSession).toHaveBeenCalledWith('target-session', true)
  })

  it('reports a miss after all retry attempts are exhausted', async () => {
    const input = createInput({
      fetchConversationsForAgent: vi.fn(async () => [conversation('other-session')]),
    })

    const status = await runAgentChatInitialSessionSyncRetry(input)

    expect(status).toBe('missed')
    expect(input.fetchConversationsForAgent).toHaveBeenCalledTimes(3)
    expect(input.wait).toHaveBeenNthCalledWith(1, 500)
    expect(input.wait).toHaveBeenNthCalledWith(2, 1000)
    expect(input.selectSession).not.toHaveBeenCalled()
    expect(input.reportMark).toHaveBeenCalledWith('initial_session_sync_miss', {
      attempts: 3,
    })
  })

  it('stops applying fetched sessions when the effect has been cancelled', async () => {
    const input = createInput({
      fetchConversationsForAgent: vi.fn(async () => [conversation('target-session')]),
      isCancelled: vi.fn(() => true),
    })

    const status = await runAgentChatInitialSessionSyncRetry(input)

    expect(status).toBe('cancelled')
    expect(input.setSessions).not.toHaveBeenCalled()
    expect(input.selectSession).not.toHaveBeenCalled()
    expect(input.reportMark).not.toHaveBeenCalledWith(
      'initial_session_sync_found',
      expect.anything(),
    )
  })
})
