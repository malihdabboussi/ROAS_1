import { describe, expect, it, vi } from 'vitest'
import type {
  Conversation,
  DocumentAttachment,
} from '@/lib/chat/studio-chat-runtime-adapter'
import {
  runAgentChatPendingDeliverableMessage,
  runAgentChatPendingSendMessage,
  type RunAgentChatPendingDeliverableMessageInput,
  type RunAgentChatPendingSendMessageInput,
} from './agent-chat-panel.pending-messages'

class MemoryStorage {
  private values = new Map<string, string>()

  getItem = vi.fn((key: string) => this.values.get(key) ?? null)

  removeItem = vi.fn((key: string) => {
    this.values.delete(key)
  })

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

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

function createPendingSendInput(
  overrides: Partial<RunAgentChatPendingSendMessageInput> = {},
): RunAgentChatPendingSendMessageInput {
  const storage = new MemoryStorage()
  return {
    agentKey: 'agent-alpha',
    storageKey: 'team-pending-send-message',
    storage,
    inFlightKeys: new Set<string>(),
    sessionsLoading: false,
    initializing: false,
    isStopping: false,
    activeCampaignId: 'campaign-active',
    getNewConversationCampaignScope: vi.fn(() => null),
    setNewConversationCampaignScope: vi.fn(),
    setActiveCampaign: vi.fn(),
    createAndSelectSession: vi.fn(async () => conversation('created-session')),
    setPendingStrategySessionId: vi.fn(),
    sendMessageStreaming: vi.fn(async () => 'ok'),
    fetchConversationsForAgent: vi.fn(async () => [conversation('created-session')]),
    setSessions: vi.fn(),
    setSelectedSessionId: vi.fn(),
    onSessionChange: vi.fn(),
    sendWithToast: vi.fn(async () => undefined),
    ...overrides,
  }
}

function createPendingDeliverableInput(
  overrides: Partial<RunAgentChatPendingDeliverableMessageInput> = {},
): RunAgentChatPendingDeliverableMessageInput {
  const storage = new MemoryStorage()
  return {
    agentKey: 'agent-alpha',
    storageKey: 'team-pending-deliverable-message',
    storage,
    inFlightKeys: new Set<string>(),
    sessionsLoading: false,
    initializing: false,
    isStopping: false,
    sendWithToast: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('agent chat pending messages', () => {
  it('skips pending sends before reading storage while sessions are busy', async () => {
    const input = createPendingSendInput({ sessionsLoading: true })

    await expect(runAgentChatPendingSendMessage(input)).resolves.toBe('skipped-busy')

    expect(input.storage.getItem).not.toHaveBeenCalled()
    expect(input.sendWithToast).not.toHaveBeenCalled()
  })

  it('removes invalid or empty pending sends without sending', async () => {
    const storage = new MemoryStorage()
    storage.setItem('team-pending-send-message', '{')
    const invalid = createPendingSendInput({ storage })

    await expect(runAgentChatPendingSendMessage(invalid)).resolves.toBe('removed-invalid')

    expect(storage.removeItem).toHaveBeenCalledWith('team-pending-send-message')
    expect(invalid.sendWithToast).not.toHaveBeenCalled()

    storage.setItem(
      'team-pending-send-message',
      JSON.stringify({ agentKey: 'agent-alpha', content: '   ' }),
    )
    const empty = createPendingSendInput({ storage })

    await expect(runAgentChatPendingSendMessage(empty)).resolves.toBe('removed-empty')

    expect(empty.sendWithToast).not.toHaveBeenCalled()
  })

  it('leaves another agent pending send in storage', async () => {
    const storage = new MemoryStorage()
    storage.setItem(
      'team-pending-send-message',
      JSON.stringify({ agentKey: 'agent-beta', content: 'Hello' }),
    )
    const input = createPendingSendInput({ storage })

    await expect(runAgentChatPendingSendMessage(input)).resolves.toBe('skipped-agent')

    expect(storage.removeItem).not.toHaveBeenCalled()
    expect(input.inFlightKeys.size).toBe(0)
    expect(input.sendWithToast).not.toHaveBeenCalled()
  })

  it('sends a normal pending message with trimmed content and clears in-flight state', async () => {
    const storage = new MemoryStorage()
    storage.setItem(
      'team-pending-send-message',
      JSON.stringify({ agentKey: 'agent-alpha', content: '  Launch plan  ' }),
    )
    const inFlightKeys = new Set<string>()
    const input = createPendingSendInput({ storage, inFlightKeys })

    await expect(runAgentChatPendingSendMessage(input)).resolves.toBe('sent')

    expect(input.sendWithToast).toHaveBeenCalledWith('Launch plan')
    expect(storage.removeItem).toHaveBeenCalledWith('team-pending-send-message')
    expect(inFlightKeys.has('team-pending-send-message')).toBe(false)
  })

  it('starts a suppressed strategy session in the target campaign', async () => {
    const storage = new MemoryStorage()
    storage.setItem(
      'team-pending-send-message',
      JSON.stringify({
        agentKey: 'agent-alpha',
        content: '/strategy-planner',
        campaignId: 'campaign-strategy',
        campaignName: 'Strategy Campaign',
        suppressUserMessage: true,
      }),
    )
    const created = conversation('created-session', { campaign_id: 'campaign-strategy' })
    const refreshed = [created, conversation('other-session')]
    const input = createPendingSendInput({
      storage,
      createAndSelectSession: vi.fn(async () => created),
      fetchConversationsForAgent: vi.fn(async () => refreshed),
    })

    await expect(runAgentChatPendingSendMessage(input)).resolves.toBe('started-strategy')

    expect(input.setNewConversationCampaignScope).toHaveBeenCalledWith('campaign-strategy')
    expect(input.setActiveCampaign).toHaveBeenCalledWith('campaign-strategy', 'Strategy Campaign')
    expect(input.createAndSelectSession).toHaveBeenCalledWith('campaign-strategy')
    expect(input.setPendingStrategySessionId).toHaveBeenCalledWith('created-session')
    expect(input.sendMessageStreaming).toHaveBeenCalledWith({
      conversation_id: 'created-session',
      content: '/strategy-planner',
      campaign_id: 'campaign-strategy',
      suppressUserMessage: true,
    })
    expect(input.fetchConversationsForAgent).toHaveBeenCalledWith('agent-alpha')
    expect(input.setSessions).toHaveBeenCalledWith(refreshed)
    expect(input.setSelectedSessionId).toHaveBeenCalledWith('created-session')
    expect(input.onSessionChange).toHaveBeenCalledWith('created-session')
  })

  it('uses the current campaign scope for suppressed sends without payload campaign id', async () => {
    const storage = new MemoryStorage()
    storage.setItem(
      'team-pending-send-message',
      JSON.stringify({
        agentKey: 'agent-alpha',
        content: '/strategy-planner',
        suppressUserMessage: true,
      }),
    )
    const input = createPendingSendInput({
      storage,
      activeCampaignId: 'campaign-active',
      getNewConversationCampaignScope: vi.fn(() => 'campaign-ref'),
    })

    await expect(runAgentChatPendingSendMessage(input)).resolves.toBe('started-strategy')

    expect(input.createAndSelectSession).toHaveBeenCalledWith('campaign-ref')
    expect(input.sendMessageStreaming).toHaveBeenCalledWith(
      expect.objectContaining({ campaign_id: 'campaign-ref' }),
    )
  })

  it('sends a pending deliverable with documents and clears in-flight state', async () => {
    const storage = new MemoryStorage()
    const documents: DocumentAttachment[] = [{ filename: 'brief.md', type: 'text', text: 'Brief' }]
    storage.setItem(
      'team-pending-deliverable-message',
      JSON.stringify({ agentKey: 'agent-alpha', content: '  Read this  ', documents }),
    )
    const inFlightKeys = new Set<string>()
    const input = createPendingDeliverableInput({ storage, inFlightKeys })

    await expect(runAgentChatPendingDeliverableMessage(input)).resolves.toBe('sent')

    expect(input.sendWithToast).toHaveBeenCalledWith('Read this', documents)
    expect(storage.removeItem).toHaveBeenCalledWith('team-pending-deliverable-message')
    expect(inFlightKeys.has('team-pending-deliverable-message')).toBe(false)
  })
})
