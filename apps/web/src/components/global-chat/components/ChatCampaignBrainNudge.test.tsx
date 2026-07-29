import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatCampaignBrainNudge } from './ChatCampaignBrainNudge'

type MockConversation = {
  id: string
  campaign_id: string | null
  metadata: Record<string, unknown>
}

const mocks = vi.hoisted(() => ({
  activeConversationId: 'conversation-1',
  conversations: [
    {
      id: 'conversation-1',
      campaign_id: null,
      metadata: {},
    },
  ] as MockConversation[],
  messages: [{ role: 'user' }, { role: 'user' }, { role: 'user' }],
  workContext: { surface: 'general' as const },
  spaces: [{ id: 'space-1', campaign_id: 'campaign-1', space_kind: 'campaign' }],
  requestConversationScopePicker: vi.fn(),
  dismissedIds: [] as string[],
  addDismissedId: vi.fn((id: string) => [id]),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useActiveMessages: () => mocks.messages,
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeConversationId: mocks.activeConversationId,
      conversations: mocks.conversations,
    }),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ spaces: mocks.spaces }),
}))

vi.mock('../store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ workContext: mocks.workContext }),
}))

vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ requestConversationScopePicker: mocks.requestConversationScopePicker }),
}))

vi.mock('../lib/global-chat-storage', () => ({
  readCampaignBrainNudgeDismissedConversationIds: () => mocks.dismissedIds,
  addCampaignBrainNudgeDismissedConversationId: mocks.addDismissedId,
}))

describe('ChatCampaignBrainNudge', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mocks.activeConversationId = 'conversation-1'
    mocks.conversations = [
      {
        id: 'conversation-1',
        campaign_id: null,
        metadata: {},
      },
    ]
    mocks.workContext = { surface: 'general' }
    mocks.dismissedIds = []
    vi.clearAllMocks()
  })

  it('guides an eligible chat into the canonical campaign and space picker', () => {
    render(<ChatCampaignBrainNudge />)

    fireEvent.click(screen.getByRole('button', { name: 'Save this chat to a campaign' }))

    expect(mocks.requestConversationScopePicker).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Select client campaign' })).toBeNull()
  })

  it('dismisses the compact prompt for the active conversation', () => {
    render(<ChatCampaignBrainNudge />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss campaign suggestion' }))

    expect(mocks.addDismissedId).toHaveBeenCalledWith('conversation-1')
    expect(screen.queryByText('This chat seems useful. Save it to a campaign')).toBeNull()
  })

  it('does not render when the conversation already has a persisted client scope', () => {
    mocks.conversations = [
      {
        id: 'conversation-1',
        campaign_id: 'campaign-1',
        metadata: { space_id: 'space-1' },
      },
    ]

    render(<ChatCampaignBrainNudge />)

    expect(screen.queryByText('This chat seems useful. Save it to a campaign')).toBeNull()
  })
})
