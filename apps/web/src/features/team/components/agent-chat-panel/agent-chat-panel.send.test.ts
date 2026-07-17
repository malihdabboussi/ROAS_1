import { describe, expect, it, vi } from 'vitest'
import type {
  Conversation,
  DocumentAttachment,
  Message,
  MessageReference,
} from '@/lib/chat/studio-chat-runtime-adapter'
import type { AttachedArtifact, ChatModelSettings } from '@/lib/chat'
import { assignConversationCampaign } from '@/lib/conversations/conversations-api'
import { sendAgentChatMessage, type SendAgentChatMessageInput } from './agent-chat-panel.send'

vi.mock('@/lib/conversations/conversations-api', () => ({
  assignConversationCampaign: vi.fn(async (id: string, campaignId: string | null) => ({
    id,
    user_id: 'user-1',
    campaign_id: campaignId,
    title: `Session ${id}`,
    agent_id: 'agent-alpha',
    status: 'active',
    metadata: {},
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
  })),
}))

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

function message(id: string, conversationId = 'session-1'): Message {
  return {
    id,
    conversation_id: conversationId,
    role: 'user',
    content: 'Hello',
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-24T00:00:00.000Z',
  }
}

function createInput(
  overrides: Partial<SendAgentChatMessageInput> = {},
): SendAgentChatMessageInput {
  let sessions = [conversation('session-1', { title: 'Existing session' })]
  const setSessions = vi.fn((next: Conversation[] | ((prev: Conversation[]) => Conversation[])) => {
    sessions = typeof next === 'function' ? next(sessions) : next
  })

  return {
    content: 'Plan the launch',
    selectedSessionId: 'session-1',
    isStopping: false,
    activeCampaignId: 'campaign-1',
    selectedSession: sessions[0] ?? null,
    modelId: 'auto',
    agentKey: 'agent-alpha',
    systemContext: 'team context',
    uiSelectedArtifact: null,
    getNewConversationCampaignScope: vi.fn(() => null),
    createAndSelectSession: vi.fn(async () => conversation('created-session')),
    getSessions: vi.fn(() => sessions),
    getMessages: vi.fn(() => [message('message-1')]),
    setSessions,
    promoteConversation: vi.fn(),
    onConversationUpdated: vi.fn(),
    sendMessageStreaming: vi.fn(async () => 'assistant-message-1'),
    cancelTeamDraftTimer: vi.fn(),
    clearConversationTeamDraft: vi.fn(async () => undefined),
    getStoredConversation: vi.fn(() => undefined),
    fetchConversationsForAgent: vi.fn(async () => [conversation('refreshed-session')]),
    suggestConversationTitle: vi.fn(async () => ({ title: 'Launch title' })),
    beginSessionTitleReveal: vi.fn(),
    readConversationSpaceId: vi.fn(() => null),
    nowIso: vi.fn(() => '2026-06-24T01:00:00.000Z'),
    ...overrides,
  }
}

describe('sendAgentChatMessage', () => {
  it('does not send while the selected conversation is stopping', async () => {
    const input = createInput({ isStopping: true })

    await sendAgentChatMessage(input)

    expect(input.sendMessageStreaming).not.toHaveBeenCalled()
    expect(input.createAndSelectSession).not.toHaveBeenCalled()
    expect(input.fetchConversationsForAgent).not.toHaveBeenCalled()
  })

  it('creates a scoped session when no conversation is selected', async () => {
    const created = conversation('created-session', { campaign_id: null })
    const input = createInput({
      selectedSessionId: null,
      activeCampaignId: null,
      selectedSession: null,
      getNewConversationCampaignScope: vi.fn(() => 'campaign-scope'),
      createAndSelectSession: vi.fn(async () => created),
      getMessages: vi.fn(() => []),
    })

    await sendAgentChatMessage(input)

    expect(input.createAndSelectSession).toHaveBeenCalledWith('campaign-scope')
    expect(input.sendMessageStreaming).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'created-session',
        campaign_id: 'campaign-scope',
        content: 'Plan the launch',
      }),
    )
    expect(input.fetchConversationsForAgent).toHaveBeenCalledWith('agent-alpha')
    expect(input.suggestConversationTitle).toHaveBeenCalledWith('Plan the launch')
  })

  it('promotes an existing session and maps the stream payload', async () => {
    const documents: DocumentAttachment[] = [
      { filename: 'brief.pdf', type: 'text', fileUrl: 'https://example.test/brief.pdf' },
    ]
    const artifacts: AttachedArtifact[] = [
      { id: 'artifact-1', type: 'offer', label: 'Offer' },
    ]
    const references: MessageReference[] = [
      { id: 'ref-1', kind: 'artifact', label: 'Brief', type: 'document' },
    ]
    const modelSettings: ChatModelSettings = { speed_mode: 'fast' }
    const input = createInput({
      content: '  Build it  ',
      documents,
      artifacts,
      references,
      modelOverride: 'auto:power',
      modelSettings,
      uiSelectedArtifact: { id: 'selected-1', type: 'offer', label: 'Selected offer' },
      readConversationSpaceId: vi.fn(() => 'space-1'),
      getMessages: vi.fn(() => []),
    })

    await sendAgentChatMessage(input)

    expect(input.promoteConversation).toHaveBeenCalledWith('session-1')
    expect(input.onConversationUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'session-1',
        updated_at: '2026-06-24T01:00:00.000Z',
      }),
    )
    expect(input.sendMessageStreaming).toHaveBeenCalledWith({
      conversation_id: 'session-1',
      content: '  Build it  ',
      model: 'auto:power',
      documents,
      campaign_id: 'campaign-1',
      space_id: 'space-1',
      scope_kind: 'campaign',
      highlighted_artifacts: [{ id: 'artifact-1', type: 'offer', label: 'Offer' }],
      message_references: references,
      model_settings: modelSettings,
      ui_selected_artifact: { id: 'selected-1', type: 'offer', label: 'Selected offer' },
      system_context: 'team context',
    })
    expect(input.suggestConversationTitle).toHaveBeenCalledWith('Build it')
  })

  it('falls back to the first message when title suggestion fails', async () => {
    const input = createInput({
      content: 'Start our Ops Desk check-in',
      getMessages: vi.fn(() => []),
      suggestConversationTitle: vi.fn(async () => {
        throw new Error('suggest failed')
      }),
    })

    await sendAgentChatMessage(input)
    await Promise.resolve()

    expect(input.beginSessionTitleReveal).toHaveBeenCalledWith(
      'session-1',
      'Start our Ops Desk check-in',
    )
  })

  it('clears team draft metadata after a successful send', async () => {
    const draft = conversation('session-1', {
      metadata: { team_draft: true, draft_started_at: '2026-06-24T00:00:00.000Z', keep: true },
    })
    const input = createInput({
      selectedSession: draft,
      getSessions: vi.fn(() => [draft]),
      getStoredConversation: vi.fn(() => draft),
    })

    await sendAgentChatMessage(input)

    expect(input.cancelTeamDraftTimer).toHaveBeenCalledWith('session-1')
    expect(input.clearConversationTeamDraft).toHaveBeenCalledWith('session-1')
    expect(input.onConversationUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'session-1',
        metadata: { keep: true },
      }),
    )
  })

  it('remounts an existing General conversation onto the preferred assigned campaign', async () => {
    const input = createInput({
      activeCampaignId: 'general-campaign',
      getPreferredCampaignWhenGeneral: vi.fn(() => 'impact-campaign'),
      getMessages: vi.fn(() => []),
    })

    await sendAgentChatMessage(input)

    expect(assignConversationCampaign).toHaveBeenCalledWith('session-1', 'impact-campaign')
    expect(input.sendMessageStreaming).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'session-1',
        campaign_id: 'impact-campaign',
      }),
    )
  })
})
