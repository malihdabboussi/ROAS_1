import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShellChatMenu } from './ShellChatMenu'

const mocks = vi.hoisted(() => ({
  conversation: {
    id: 'conversation-1',
    title: 'Quarterly launch',
    campaign_id: null,
    metadata: {},
  },
  openInNewTab: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/conversations/SpaceConversationsListAdapter', () => ({
  SpaceConversationsList: (props: {
    onShareConversation: (conversation: typeof mocks.conversation) => void
    onOpenConversationInNewTab: (conversationId: string) => void
  }) => (
    <>
      <button type="button" onClick={() => props.onShareConversation(mocks.conversation)}>
        Share conversation
      </button>
      <button type="button" onClick={() => props.onOpenConversationInNewTab(mocks.conversation.id)}>
        Open conversation in new tab
      </button>
    </>
  ),
}))

vi.mock('@/components/conversations', () => ({
  ConversationShareModal: (props: {
    open: boolean
    conversation: typeof mocks.conversation | null
    orgName: string
  }) =>
    props.open ? (
      <div role="dialog" aria-label="Share conversation modal">
        {props.conversation?.id}:{props.orgName}
      </div>
    ) : null,
}))

vi.mock('@/components/filters', () => ({
  Team2FilterDropdown: () => null,
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ activeAgentKey: 'vibey', roster: [], loadRoster: vi.fn() }),
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeOrgId: 'org-1',
      getActiveOrg: () => ({ organizations: { name: 'Acme' } }),
    }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        setActiveConversationId: vi.fn(),
        conversations: [],
        activeConversationId: null,
      }),
    { getState: () => ({}) },
  ),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn(async () => []),
  invalidateCachedFetch: vi.fn(),
  peekCachedFetch: vi.fn(() => []),
}))

vi.mock('@/lib/utils/open-in-new-tab', () => ({
  openInNewTab: mocks.openInNewTab,
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      openChatDrawer: vi.fn(),
      openFreshChatDrawer: vi.fn(),
      restoreChatDrawer: vi.fn(),
      requestNewChat: vi.fn(),
      setMenuMode: vi.fn(),
      chatDrawer: { minimized: false, conversationId: null },
    }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ShellChatMenu', () => {
  it('opens the real conversation sharing dialog from the conversation menu', () => {
    render(<ShellChatMenu />)

    fireEvent.click(screen.getByRole('button', { name: 'Share conversation' }))

    expect(screen.getByRole('dialog', { name: 'Share conversation modal' })).toHaveTextContent(
      'conversation-1:Acme',
    )
  })

  it('uses the shared safe new-tab helper', () => {
    render(<ShellChatMenu />)

    fireEvent.click(screen.getByRole('button', { name: 'Open conversation in new tab' }))

    expect(mocks.openInNewTab).toHaveBeenCalledWith('/home?conv=conversation-1')
  })
})
