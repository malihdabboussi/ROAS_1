import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACTIVE_ORG_STORAGE_KEY } from '@/lib/utils/org-storage'
import type { Conversation, Message } from '@/lib/chat/studio-chat-runtime-adapter'
import type { Campaign } from '@/lib/campaigns'
import {
  buildMobileCampaignSwitcherOptions,
  buildAgentChatTurnData,
  CAMPAIGN_SCOPE_STORAGE_KEY,
  conversationBelongsToAgent,
  findLatestSessionForCampaign,
  readCampaignScopeMap,
  readConversationSpaceId,
  readSessionMap,
  resolveActiveCampaignId,
  resolveCachedSession,
  resolveConversationCampaignId,
  resolveInitialCampaignFilter,
  resolveInitialTargetSessionId,
  resolveRequestedSessionId,
  SESSION_STORAGE_KEY,
  withTimeout,
  writeCampaignScope,
  writeSessionMap,
  resolveDefaultNewConversationCampaignId,
  isGeneralCampaignId,
  resolvePreferredCampaignWhenGeneral,
} from './agent-chat-panel.logic'

function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conversation-1',
    user_id: 'user-1',
    campaign_id: null,
    title: 'Launch planning',
    agent_id: 'agent-alpha',
    status: 'active',
    metadata: {},
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:10:00.000Z',
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

function buildCampaign(
  overrides: Partial<Omit<Campaign, 'name'>> & { name?: string | null } = {},
): Campaign {
  return {
    id: 'campaign-1',
    name: 'Launch Campaign',
    user_id: 'user-1',
    status: 'active',
    config: {},
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  } as Campaign
}

function setActiveOrg(orgId: string): void {
  window.sessionStorage.setItem(
    ACTIVE_ORG_STORAGE_KEY,
    JSON.stringify({ state: { activeOrgId: orgId } }),
  )
}

describe('agent chat panel logic', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.useRealTimers()
  })

  it('reads conversation space ids without trimming the persisted value', () => {
    expect(
      readConversationSpaceId(buildConversation({ metadata: { space_id: ' space-alpha ' } })),
    ).toBe(' space-alpha ')
    expect(readConversationSpaceId(buildConversation({ metadata: { space_id: '   ' } }))).toBeNull()
    expect(readConversationSpaceId(null)).toBeNull()
  })

  it('narrows conversations to the active agent', () => {
    const matching = buildConversation({ agent_id: 'agent-alpha' })
    const other = buildConversation({ agent_id: 'agent-beta' })

    expect(conversationBelongsToAgent(matching, 'agent-alpha')).toBe(true)
    expect(conversationBelongsToAgent(other, 'agent-alpha')).toBe(false)
    expect(conversationBelongsToAgent(null, 'agent-alpha')).toBe(false)
  })

  it('resolves requested sessions from explicit, persisted, and mobile state', () => {
    expect(
      resolveRequestedSessionId({
        initialSessionId: 'conversation-explicit',
        isMobile: false,
        persistedSessionId: 'conversation-persisted',
      }),
    ).toBe('conversation-explicit')
    expect(
      resolveRequestedSessionId({
        initialSessionId: null,
        isMobile: false,
        persistedSessionId: 'conversation-persisted',
      }),
    ).toBe('conversation-persisted')
    expect(
      resolveRequestedSessionId({
        initialSessionId: null,
        isMobile: true,
        persistedSessionId: 'conversation-persisted',
      }),
    ).toBeNull()
  })

  it('only scopes initial conversation loading by a non-general cached campaign without a requested session', () => {
    expect(
      resolveInitialCampaignFilter({
        requestedSessionId: null,
        cachedCampaignId: 'campaign-1',
        generalCampaignId: 'general-campaign',
      }),
    ).toBe('campaign-1')
    expect(
      resolveInitialCampaignFilter({
        requestedSessionId: 'conversation-1',
        cachedCampaignId: 'campaign-1',
        generalCampaignId: 'general-campaign',
      }),
    ).toBeUndefined()
    expect(
      resolveInitialCampaignFilter({
        requestedSessionId: null,
        cachedCampaignId: 'general-campaign',
        generalCampaignId: 'general-campaign',
      }),
    ).toBeUndefined()
  })

  it('resolves requested sessions from fetched rows or compatible cached conversations', () => {
    const fetched = buildConversation({ id: 'conversation-fetched', agent_id: 'agent-alpha' })
    const cached = buildConversation({ id: 'conversation-cached', agent_id: 'agent-alpha' })
    const otherAgent = buildConversation({ id: 'conversation-other', agent_id: 'agent-beta' })

    expect(
      resolveCachedSession({
        requestedSessionId: 'conversation-fetched',
        sessionsList: [fetched],
        cachedConversations: [cached],
        agentKey: 'agent-alpha',
      }),
    ).toEqual({
      cachedSessionId: 'conversation-fetched',
      sessionsList: [fetched],
      shouldClearPersistedSession: false,
    })

    expect(
      resolveCachedSession({
        requestedSessionId: 'conversation-cached',
        sessionsList: [fetched],
        cachedConversations: [cached],
        agentKey: 'agent-alpha',
      }),
    ).toEqual({
      cachedSessionId: 'conversation-cached',
      sessionsList: [cached, fetched],
      shouldClearPersistedSession: false,
    })

    expect(
      resolveCachedSession({
        requestedSessionId: 'conversation-other',
        sessionsList: [fetched],
        cachedConversations: [otherAgent],
        agentKey: 'agent-alpha',
      }),
    ).toEqual({
      cachedSessionId: null,
      sessionsList: [fetched],
      shouldClearPersistedSession: true,
    })
  })

  it('resolves the initial target session for desktop, mobile, and explicit cached requests', () => {
    const first = buildConversation({ id: 'conversation-first' })

    expect(
      resolveInitialTargetSessionId({
        cachedSessionId: 'conversation-requested',
        sessionsList: [first],
        initialSessionId: 'conversation-requested',
        isMobile: true,
      }),
    ).toBe('conversation-requested')
    expect(
      resolveInitialTargetSessionId({
        cachedSessionId: null,
        sessionsList: [first],
        initialSessionId: null,
        isMobile: false,
      }),
    ).toBe('conversation-first')
    expect(
      resolveInitialTargetSessionId({
        cachedSessionId: null,
        sessionsList: [first],
        initialSessionId: null,
        isMobile: true,
      }),
    ).toBeNull()
  })

  it('resolves active campaigns with General fallback for unscoped sessions', () => {
    expect(
      resolveActiveCampaignId(buildConversation({ campaign_id: 'campaign-1' }), 'general'),
    ).toBe('campaign-1')
    expect(resolveActiveCampaignId(buildConversation({ campaign_id: null }), 'general')).toBe(
      'general',
    )
    expect(resolveActiveCampaignId(null, 'general')).toBeNull()
  })

  it('prefers assigned campaigns over General for new Team chats', () => {
    expect(
      resolveDefaultNewConversationCampaignId({
        assignedCampaigns: [{ id: 'impact' }],
        cachedCampaignId: 'general',
        generalCampaignId: 'general',
      }),
    ).toBe('impact')
    expect(
      resolveDefaultNewConversationCampaignId({
        assignedCampaigns: [{ id: 'impact' }],
        cachedCampaignId: 'cached-non-general',
        generalCampaignId: 'general',
      }),
    ).toBe('cached-non-general')
    expect(
      resolveDefaultNewConversationCampaignId({
        assignedCampaigns: [],
        cachedCampaignId: 'general',
        generalCampaignId: 'general',
      }),
    ).toBe('general')
    expect(isGeneralCampaignId('general', 'general')).toBe(true)
    expect(isGeneralCampaignId('impact', 'general')).toBe(false)
  })

  it('remounts General chats onto a single assigned campaign', () => {
    expect(
      resolvePreferredCampaignWhenGeneral({
        activeCampaignId: 'general',
        assignedCampaigns: [{ id: 'impact' }],
        generalCampaignId: 'general',
      }),
    ).toBe('impact')
    expect(
      resolvePreferredCampaignWhenGeneral({
        activeCampaignId: 'general',
        assignedCampaigns: [{ id: 'impact' }, { id: 'other' }],
        generalCampaignId: 'general',
      }),
    ).toBeNull()
    expect(
      resolvePreferredCampaignWhenGeneral({
        activeCampaignId: 'impact',
        assignedCampaigns: [{ id: 'impact' }],
        generalCampaignId: 'general',
      }),
    ).toBeNull()
  })

  it('builds mobile campaign switcher options from General and non-general campaigns', () => {
    expect(
      buildMobileCampaignSwitcherOptions('general', [
        buildCampaign({ id: 'campaign-1', name: 'Launch', config: { icon: 'rocket' } }),
        buildCampaign({ id: 'campaign-2', name: null, config: { icon: 123 } }),
      ]),
    ).toEqual([
      { id: 'general', name: 'General', icon: 'users' },
      { id: 'campaign-1', name: 'Launch', icon: 'rocket' },
      { id: 'campaign-2', name: 'Campaign', icon: null },
    ])
  })

  it('resolves conversation campaign ids and latest sessions by campaign', () => {
    const olderGeneral = buildConversation({
      id: 'older-general',
      campaign_id: null,
      updated_at: '2026-06-24T00:05:00.000Z',
    })
    const newerGeneral = buildConversation({
      id: 'newer-general',
      campaign_id: null,
      updated_at: '2026-06-24T00:10:00.000Z',
    })
    const campaignSession = buildConversation({
      id: 'campaign-session',
      campaign_id: 'campaign-1',
      updated_at: '2026-06-24T00:03:00.000Z',
    })

    expect(resolveConversationCampaignId(olderGeneral, 'general')).toBe('general')
    expect(resolveConversationCampaignId(campaignSession, 'general')).toBe('campaign-1')
    expect(
      findLatestSessionForCampaign([olderGeneral, campaignSession, newerGeneral], 'general', 'general')
        ?.id,
    ).toBe('newer-general')
    expect(
      findLatestSessionForCampaign(
        [olderGeneral, campaignSession, newerGeneral],
        'campaign-1',
        'general',
      )?.id,
    ).toBe('campaign-session')
  })

  it('reads and writes org-scoped session maps', () => {
    setActiveOrg('org-1')

    writeSessionMap({ 'agent-alpha': 'conversation-1' })

    expect(window.localStorage.getItem(`${SESSION_STORAGE_KEY}:org-1`)).toBe(
      JSON.stringify({ 'agent-alpha': 'conversation-1' }),
    )
    expect(readSessionMap()).toEqual({ 'agent-alpha': 'conversation-1' })
  })

  it('reads, writes, and clears org-scoped campaign scope maps', () => {
    setActiveOrg('org-1')

    writeCampaignScope('agent-alpha', 'campaign-1')
    expect(readCampaignScopeMap()).toEqual({ 'agent-alpha': 'campaign-1' })
    expect(window.localStorage.getItem(`${CAMPAIGN_SCOPE_STORAGE_KEY}:org-1`)).toBe(
      JSON.stringify({ 'agent-alpha': 'campaign-1' }),
    )

    writeCampaignScope('agent-alpha', null)
    expect(readCampaignScopeMap()).toEqual({})
  })

  it('groups leading messages and user turns with voice-live user messages as responses', () => {
    const intro = buildMessage({ id: 'intro', role: 'assistant', content: 'Intro' })
    const user = buildMessage({ id: 'user-1', role: 'user', content: 'Go' })
    const assistant = buildMessage({ id: 'assistant-1', role: 'assistant', content: 'Done' })
    const voiceUser = buildMessage({
      id: 'voice-user-1',
      role: 'user',
      content: 'Voice note',
      metadata: { source: 'voice_live' },
    })
    const nextUser = buildMessage({ id: 'user-2', role: 'user', content: 'Next' })

    const result = buildAgentChatTurnData([intro, user, assistant, voiceUser, nextUser])

    expect(result.leadingMessages).toEqual([intro])
    expect(result.turns).toEqual([
      { user, responses: [assistant, voiceUser] },
      { user: nextUser, responses: [] },
    ])
  })

  it('resolves completed work and rejects timed out work', async () => {
    vi.useFakeTimers()

    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok')

    const timedOut = withTimeout(new Promise<string>(() => {}), 100)
    const timeoutAssertion = expect(timedOut).rejects.toThrow('Message hydration timed out')
    await vi.advanceTimersByTimeAsync(100)

    await timeoutAssertion
  })
})
