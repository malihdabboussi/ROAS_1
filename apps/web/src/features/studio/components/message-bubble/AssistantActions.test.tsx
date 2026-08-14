import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { globalChatSeedMatchesPanel } from '@/components/global-chat/lib/global-chat-seed-match'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useChatStore } from '../../store/use-chat-store'
import { AssistantActions } from './AssistantActions'

const actionMocks = vi.hoisted(() => ({
  AgentTurnFeedbackActions: vi.fn(
    (_props: { onFork?: () => void | Promise<void> }, _legacyContext?: unknown) => (
      <div data-testid="agent-turn-feedback-actions" />
    ),
  ),
  forkConversation: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/components/chat/AgentTurnFeedbackActions', () => actionMocks)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: actionMocks.push }),
}))

vi.mock('../../services/chat.service', () => ({
  forkConversation: actionMocks.forkConversation,
}))

afterEach(() => {
  cleanup()
  useGlobalChatStore.setState({ pendingSeed: null, workContext: { surface: 'general' } })
  useChatStore.setState({ conversations: [] })
  vi.clearAllMocks()
})

describe('AssistantActions', () => {
  it('replaces the legacy 3-dot menu with agent turn feedback actions', () => {
    render(
      <AssistantActions
        content="Ready to help"
        messageId="33333333-3333-4333-8333-333333333333"
        conversationId="44444444-4444-4444-8444-444444444444"
      />,
    )

    expect(screen.getByTestId('agent-turn-feedback-actions')).not.toBeNull()
    expect(screen.queryByRole('button', { name: /open message actions/i })).toBeNull()
    expect(actionMocks.AgentTurnFeedbackActions).toHaveBeenCalledWith(
      expect.objectContaining({
        targetKind: 'conversation_message',
        targetId: '33333333-3333-4333-8333-333333333333',
        sourceSurface: 'assistant_message',
        content: 'Ready to help',
        canFork: true,
        showFeedback: false,
        onReply: expect.any(Function),
      }),
      undefined,
    )
  })

  it('replies with an exact message reference instead of rating the chat turn', () => {
    useGlobalChatStore.setState({ workContext: { surface: 'general' } })
    useChatStore.setState({
      conversations: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          user_id: 'user-1',
          campaign_id: 'campaign-1',
          title: 'Client Strategy',
          agent_id: null,
          status: 'active',
          metadata: { space_id: 'space-1' },
          created_at: '2026-08-14T00:00:00.000Z',
          updated_at: '2026-08-14T00:00:00.000Z',
        },
      ],
    })
    render(
      <AssistantActions
        content="Launch the client strategy and keep it running."
        messageId="33333333-3333-4333-8333-333333333333"
        conversationId="44444444-4444-4444-8444-444444444444"
      />,
    )

    const lastCall = actionMocks.AgentTurnFeedbackActions.mock.calls.at(-1) as
      | [{ onReply?: () => void; showFeedback?: boolean }]
      | undefined
    lastCall?.[0].onReply?.()

    expect(lastCall?.[0].showFeedback).toBe(false)
    expect(useGlobalChatStore.getState().pendingSeed).toMatchObject({
      conversationId: '44444444-4444-4444-8444-444444444444',
      seedMode: 'attach',
      workContext: {
        surface: 'spaces',
        spaceId: 'space-1',
        campaignId: 'campaign-1',
      },
      references: [
        {
          kind: 'conversation',
          id: '44444444-4444-4444-8444-444444444444',
          type: 'message:33333333-3333-4333-8333-333333333333',
          label: 'Reply to assistant: Launch the client strategy and keep it running.',
        },
      ],
    })
    expect(globalChatSeedMatchesPanel(useGlobalChatStore.getState().pendingSeed!, 'space-1')).toBe(
      true,
    )
  })

  it('keeps actions visible when pinActions is true', () => {
    const { container } = render(
      <AssistantActions
        content="Ready to help"
        messageId="33333333-3333-4333-8333-333333333333"
        conversationId="44444444-4444-4444-8444-444444444444"
        pinActions
      />,
    )

    const row = container.firstElementChild
    expect(row?.className).toContain('opacity-100')
    expect(row?.className).not.toContain('group-hover:opacity-100')
  })

  it('hides actions until row hover when pinActions is false', () => {
    const { container } = render(
      <AssistantActions
        content="Ready to help"
        messageId="33333333-3333-4333-8333-333333333333"
        conversationId="44444444-4444-4444-8444-444444444444"
      />,
    )

    const row = container.firstElementChild
    expect(row?.className).toContain('opacity-0')
    expect(row?.className).toContain('group-hover:opacity-100')
  })

  it('opens the newly created conversation after a successful fork', async () => {
    actionMocks.forkConversation.mockResolvedValue({
      id: 'forked/conversation',
      title: 'Fork of launch chat',
    })
    render(
      <AssistantActions
        content="Ready to help"
        messageId="33333333-3333-4333-8333-333333333333"
        conversationId="44444444-4444-4444-8444-444444444444"
      />,
    )

    const lastCall = actionMocks.AgentTurnFeedbackActions.mock.calls.at(-1) as
      | [{ onFork?: () => void | Promise<void> }]
      | undefined
    const props = lastCall?.[0]
    await act(async () => {
      await props?.onFork?.()
    })

    expect(actionMocks.forkConversation).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
      '33333333-3333-4333-8333-333333333333',
    )
    expect(actionMocks.push).toHaveBeenCalledWith('/home?conv=forked%2Fconversation')
  })
})
