import type { ReactNode } from 'react'
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
  addConversation: vi.fn(),
  openChatDrawer: vi.fn(),
  openInNewTab: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/conversations/SpaceConversationsListAdapter', () => ({
  SpaceConversationsList: (props: {
    onSelectConversation: (conversationId: string) => void
    onShareConversation: (conversation: typeof mocks.conversation) => void
    onOpenConversationInNewTab: (conversationId: string) => void
    headerEndSlot?: ReactNode
    headerFooterSlot?: ReactNode
  }) => (
    <>
      {props.headerEndSlot}
      {props.headerFooterSlot}
      <button type="button" onClick={() => props.onSelectConversation(mocks.conversation.id)}>
        Select conversation
      </button>
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
    selector({
      activeAgentKey: 'reed',
      roster: [
        {
          kind: 'agent',
          agent_key: 'reed',
          display_name: 'Reed',
          avatar_url: null,
          role_label: 'Agency Strategist',
        },
      ],
      loadRoster: vi.fn(),
    }),
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
    { getState: () => ({ addConversation: mocks.addConversation }) },
  ),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn(async () => []),
  invalidateCachedFetch: vi.fn(),
  peekCachedFetch: vi.fn(() => [mocks.conversation]),
}))

vi.mock('@/lib/utils/open-in-new-tab', () => ({
  openInNewTab: mocks.openInNewTab,
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      openChatDrawer: mocks.openChatDrawer,
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
  it('hydrates the canonical chat store before opening a history conversation', () => {
    render(<ShellChatMenu />)

    fireEvent.click(screen.getByRole('button', { name: 'Select conversation' }))

    expect(mocks.addConversation).toHaveBeenCalledWith(mocks.conversation)
    expect(mocks.openChatDrawer).toHaveBeenCalledWith('conversation-1')
  })

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

  it('shows the selected agent scope and lets the user remove it', () => {
    render(<ShellChatMenu />)

    const removeAgentFilter = screen.getByRole('button', {
      name: 'Remove Reed filter',
    })
    expect(removeAgentFilter).toBeInTheDocument()
    expect(removeAgentFilter.closest('span')).toHaveAttribute(
      'title',
      'Agent · Reed · Agency Strategist',
    )

    fireEvent.click(removeAgentFilter)
    expect(screen.queryByRole('button', { name: 'Remove Reed filter' })).not.toBeInTheDocument()
  })

  it('clears the selected agent when filters reset to defaults', () => {
    render(<ShellChatMenu />)

    fireEvent.click(screen.getByRole('button', { name: 'Filter conversations' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reset to defaults' }))

    expect(screen.queryByRole('button', { name: 'Remove Reed filter' })).not.toBeInTheDocument()
  })

  it('uses the matching purple arrow control to collapse chat history', () => {
    const onCollapse = vi.fn()
    render(<ShellChatMenu onCollapse={onCollapse} />)

    const collapseHistory = screen.getByRole('button', { name: 'Collapse chat history' })
    expect(collapseHistory).toHaveClass('nav-glass-text-purple')
    expect(collapseHistory).not.toHaveClass('btn-icon-bare-sm', 'nav-glass-selected-purple')

    fireEvent.click(collapseHistory)
    expect(onCollapse).toHaveBeenCalledOnce()
  })
})
