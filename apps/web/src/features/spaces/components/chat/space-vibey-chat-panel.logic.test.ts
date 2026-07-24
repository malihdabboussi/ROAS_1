import { beforeEach, describe, expect, it } from 'vitest'
import type { Conversation, Message } from '@/lib/conversations/conversation.types'
import {
  buildSpaceChatConversationUrl,
  conversationBelongsToChannel,
  conversationBelongsToSpace,
  DEFAULT_SPACE_CHAT_AGENT_KEY,
  getConversationAgentKey,
  isHomeChatSeedPending,
  mergeConversationLists,
  messageHasTaskMutation,
  readHomeChatSeedForSpace,
  resolveSpaceChatAutoFocusTarget,
  resolveSpaceChatScope,
  resolveSpaceChatSeedSendOptions,
  resolveSpaceChatSendAgentKey,
} from './space-vibey-chat-panel.logic'

function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: 'conversation-1',
    user_id: 'user-1',
    campaign_id: null,
    title: null,
    agent_id: null,
    status: 'active',
    metadata: {},
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

function message(overrides: Partial<Message>): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: null,
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('space ROAS chat panel logic', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('reads only the home chat seed for the requested space', () => {
    expect(readHomeChatSeedForSpace('space-1')).toBeNull()

    window.sessionStorage.setItem(
      'home-chat-seed',
      JSON.stringify({ space_id: 'space-2', content: 'wrong space' }),
    )
    expect(readHomeChatSeedForSpace('space-1')).toBeNull()

    window.sessionStorage.setItem(
      'home-chat-seed',
      JSON.stringify({
        space_id: 'space-1',
        content: 'Plan launch',
        documents: [{ filename: 'brief.txt', type: 'text', text: 'brief' }],
        artifacts: [{ id: 'artifact-1', type: 'presentation', label: 'Deck' }],
        model: 'gpt-test',
        references: [{ kind: 'artifact', id: 'artifact-1', type: 'presentation', label: 'Deck' }],
        modelSettings: { speed_mode: 'fast' },
      }),
    )

    expect(readHomeChatSeedForSpace('space-1')).toMatchObject({
      space_id: 'space-1',
      content: 'Plan launch',
      model: 'gpt-test',
    })

    window.sessionStorage.setItem('home-chat-seed', '{bad json')
    expect(readHomeChatSeedForSpace('space-1')).toBeNull()
  })

  it('detects pending home seed only for matching URL and storage state', () => {
    window.sessionStorage.setItem(
      'home-chat-seed',
      JSON.stringify({ space_id: 'space-1', content: 'Plan launch' }),
    )

    expect(isHomeChatSeedPending('space-1', new URLSearchParams(''))).toBe(false)
    expect(isHomeChatSeedPending('space-1', new URLSearchParams('home_seed=1&space=space-2'))).toBe(
      false,
    )
    expect(isHomeChatSeedPending('space-1', new URLSearchParams('home_seed=1&space=space-1'))).toBe(
      true,
    )
    expect(isHomeChatSeedPending('space-1', new URLSearchParams('home_seed=1'))).toBe(true)
  })

  it('detects assistant task mutations from metadata and ordered tool blocks', () => {
    expect(
      messageHasTaskMutation(message({ role: 'user', metadata: { spaces_undoable: true } })),
    ).toBe(false)
    expect(messageHasTaskMutation(message({ metadata: { spaces_undoable: true } }))).toBe(true)
    expect(
      messageHasTaskMutation(
        message({
          metadata: { content_blocks_ordered: [{ type: 'tool', name: 'create_task' }] },
        }),
      ),
    ).toBe(true)
    expect(
      messageHasTaskMutation(
        message({
          metadata: { content_blocks_ordered: [{ type: 'tool', action: 'update_task' }] },
        }),
      ),
    ).toBe(true)
    expect(
      messageHasTaskMutation(
        message({ metadata: { content_blocks_ordered: [{ type: 'tool', name: 'search' }] } }),
      ),
    ).toBe(false)
  })

  it('resolves chat scope from override, conversation, then panel fallback', () => {
    const panel = { campaignId: 'campaign-panel', spaceId: 'space-panel' }
    expect(resolveSpaceChatScope(null, panel, null)).toEqual(panel)
    expect(
      resolveSpaceChatScope(
        conversation({
          campaign_id: 'campaign-conversation',
          metadata: { space_id: 'space-conversation' },
        }),
        panel,
        null,
      ),
    ).toEqual({ campaignId: 'campaign-conversation', spaceId: 'space-conversation' })
    expect(
      resolveSpaceChatScope(
        conversation({
          campaign_id: 'campaign-conversation',
          metadata: { space_id: 'space-conversation' },
        }),
        panel,
        { campaignId: 'campaign-override', spaceId: 'space-override' },
      ),
    ).toEqual({ campaignId: 'campaign-override', spaceId: 'space-override' })
  })

  it('resolves conversation agent, space, channel ownership, and merged ordering', () => {
    expect(getConversationAgentKey(null)).toBe(DEFAULT_SPACE_CHAT_AGENT_KEY)
    expect(getConversationAgentKey(conversation({ agent_id: '  agent-a  ' }))).toBe('agent-a')

    const spaceConversation = conversation({
      id: 'space-conversation',
      metadata: { space_id: 'space-1' },
    })
    const channelConversation = conversation({
      id: 'channel-conversation',
      metadata: { channel_id: 'channel-1' },
    })

    expect(conversationBelongsToSpace(spaceConversation, 'space-1')).toBe(true)
    expect(conversationBelongsToSpace(spaceConversation, 'space-2')).toBe(false)
    expect(conversationBelongsToChannel(channelConversation, 'channel-1')).toBe(true)
    expect(conversationBelongsToChannel(channelConversation, 'channel-2')).toBe(false)

    const merged = mergeConversationLists(
      [
        conversation({
          id: 'older',
          title: 'Older',
          updated_at: '2026-06-20T00:00:00.000Z',
        }),
        conversation({
          id: 'same',
          title: 'Original',
          updated_at: '2026-06-21T00:00:00.000Z',
        }),
      ],
      [
        conversation({
          id: 'same',
          title: 'Updated',
          updated_at: '2026-06-23T00:00:00.000Z',
        }),
      ],
    )

    expect(merged.map((item) => item.id)).toEqual(['same', 'older'])
    expect(merged[0]?.title).toBe('Updated')
  })

  it('uses the requested seed agent for the first message in a fresh chat', () => {
    expect(resolveSpaceChatSendAgentKey('vibey', 'ads_manager')).toBe('ads_manager')
    expect(resolveSpaceChatSendAgentKey('vibey', '  blaze  ')).toBe('blaze')
    expect(resolveSpaceChatSendAgentKey('vibey', undefined)).toBe('vibey')
    expect(
      resolveSpaceChatSeedSendOptions({ agentKey: 'ads_manager', railIntent: 'new' }, 'vibey'),
    ).toEqual({ forceNewConversation: true, agentKey: 'ads_manager' })
    expect(
      resolveSpaceChatSeedSendOptions(
        { agentKey: 'ads_manager', conversationId: 'conversation-1' },
        'vibey',
      ),
    ).toEqual({ forceNewConversation: false, agentKey: 'ads_manager' })
    expect(
      resolveSpaceChatSeedSendOptions({ agentKey: 'ads_manager', railIntent: null }, 'vibey'),
    ).toEqual({ forceNewConversation: true, agentKey: 'ads_manager' })
  })

  it('builds encoded space and channel conversation URLs', () => {
    expect(
      buildSpaceChatConversationUrl({
        origin: 'https://app.vibey.test',
        isChannelScope: true,
        chatScopeId: 'channel/one',
        spaceId: null,
        conversationId: 'conversation one',
      }),
    ).toBe('https://app.vibey.test/home/channels/channel%2Fone?conv=conversation%20one')

    expect(
      buildSpaceChatConversationUrl({
        origin: 'https://app.vibey.test',
        isChannelScope: false,
        chatScopeId: 'space/ignored',
        spaceId: 'space one',
        conversationId: 'conversation/one',
      }),
    ).toBe('https://app.vibey.test/spaces?space=space%20one&conv=conversation%2Fone')

    expect(
      buildSpaceChatConversationUrl({
        origin: 'https://app.vibey.test',
        isChannelScope: false,
        chatScopeId: '',
        spaceId: null,
        conversationId: 'conversation-1',
      }),
    ).toBe('https://app.vibey.test/spaces?space=&conv=conversation-1')
  })

  it('resolves the next space view focus target from assistant tool and artifact blocks', () => {
    expect(resolveSpaceChatAutoFocusTarget([])).toBeNull()
    expect(resolveSpaceChatAutoFocusTarget([message({ role: 'user' })])).toBeNull()

    expect(
      resolveSpaceChatAutoFocusTarget([
        message({
          id: 'assistant-1',
          metadata: {
            content_blocks_ordered: [
              { type: 'tool', state: 'complete', name: 'create_mission', toolCallId: 'tool-1' },
              {
                type: 'artifact_preview',
                artifactType: 'presentation',
                artifactId: 'presentation-1',
              },
            ],
          },
        }),
      ]),
    ).toEqual({ key: 'missions:tool-1', viewType: 'missions' })

    expect(
      resolveSpaceChatAutoFocusTarget([
        message({
          id: 'assistant-2',
          metadata: {
            content_blocks_ordered: [{ type: 'document_card', spaceItemId: 'doc-item-1' }],
          },
        }),
      ]),
    ).toEqual({ key: 'docs:doc-item-1', viewType: 'docs' })

    expect(
      resolveSpaceChatAutoFocusTarget([
        message({
          id: 'assistant-3',
          metadata: {
            content_blocks_ordered: [
              {
                type: 'artifact_preview',
                artifactType: 'instagram-research',
                artifactId: 'research-1',
              },
            ],
          },
        }),
      ]),
    ).toEqual({ key: 'instagram_research:research-1', viewType: 'instagram_research' })

    expect(
      resolveSpaceChatAutoFocusTarget([
        message({
          id: 'assistant-website',
          metadata: {
            content_blocks_ordered: [
              {
                type: 'artifact_preview',
                artifactType: 'website',
                artifactId: 'website-1',
              },
            ],
          },
        }),
      ]),
    ).toEqual({ key: 'websites:website-1', viewType: 'websites' })

    expect(
      resolveSpaceChatAutoFocusTarget([
        message({
          id: 'assistant-4',
          metadata: {
            content_blocks_ordered: [
              { type: 'document_card' },
              {
                type: 'artifact_preview',
                artifactType: 'unknown',
                artifactId: 'artifact-1',
              },
            ],
          },
        }),
      ]),
    ).toBeNull()
  })
})
