import { type HTMLAttributes, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Conversation } from '@/lib/conversations'
import { SpaceConversationsList } from './SpaceConversationsList'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      animate: _animate,
      initial: _initial,
      transition: _transition,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      animate?: unknown
      initial?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('./ConversationActionsMenu', () => ({
  ConversationActionsMenu: () => null,
}))

const nowIso = () => new Date().toISOString()

function conversation(overrides: Partial<Conversation> & { id: string }): Conversation {
  const activityAt = overrides.last_message_at ?? overrides.updated_at ?? nowIso()
  return {
    user_id: 'user-1',
    campaign_id: null,
    title: 'Untitled',
    agent_id: 'vibey',
    status: 'active',
    metadata: {},
    effective_level: 'admin',
    ...overrides,
    id: overrides.id,
    created_at: overrides.created_at ?? activityAt,
    updated_at: overrides.updated_at ?? activityAt,
    last_message_at:
      overrides.last_message_at !== undefined ? overrides.last_message_at : activityAt,
  }
}

type SpaceConversationsListProps = React.ComponentProps<typeof SpaceConversationsList>

function listProps(
  overrides: Partial<SpaceConversationsListProps> = {},
): SpaceConversationsListProps {
  return {
    conversations: [],
    selectedConversationId: null,
    query: '',
    onQueryChange: vi.fn(),
    onSelectConversation: vi.fn(),
    onNewConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onRenameConversation: vi.fn(),
    onTogglePinConversation: vi.fn(),
    onToggleArchiveConversation: vi.fn(),
    onMoveConversation: vi.fn(),
    onDuplicateConversation: vi.fn(),
    onCopyConversationLink: vi.fn(),
    onShareConversation: vi.fn(),
    onBack: vi.fn(),
    loading: false,
    isOrgContext: true,
    ...overrides,
  }
}

describe('SpaceConversationsList folders', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders client folders with nested chats', () => {
    render(
      <SpaceConversationsList
        {...listProps({
          conversations: [
            conversation({
              id: 'above-1',
              title: 'Campaign update',
              campaign_id: 'above-it',
            }),
            conversation({
              id: 'loose-1',
              title: 'Personal note',
              campaign_id: null,
            }),
          ],
          groupBy: 'client',
          campaignNameById: { 'above-it': 'Above It' },
          clientCampaignIds: ['above-it'],
        })}
      />,
    )

    expect(screen.getByRole('button', { name: 'Above It' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument()
    expect(screen.getByText('Campaign update')).toBeInTheDocument()
    expect(screen.getByText('Personal note')).toBeInTheDocument()
  })

  it('can render dated, divided rows for the full chats page', () => {
    render(
      <SpaceConversationsList
        {...listProps({
          conversations: [
            conversation({
              id: 'dated-1',
              title: 'Campaign review',
              updated_at: '2025-06-10T12:00:00.000Z',
            }),
          ],
          showUpdatedAt: true,
          dividedRows: true,
        })}
      />,
    )

    expect(screen.getByText('Jun 10, 2025')).toBeInTheDocument()
    expect(screen.getByText('Campaign review').closest('div[title]')).toHaveClass(
      'border-b',
      'rounded-none',
    )
  })

  it('moves pinned chats into a Pinned section above Recents', () => {
    render(
      <SpaceConversationsList
        {...listProps({
          compactHeader: true,
          compactHeaderTitle: 'Recents',
          hideHeaderBottomBorder: true,
          splitPinnedSection: true,
          conversations: [
            conversation({
              id: 'pinned-1',
              title: 'ROAS Marketing Strategy',
              metadata: { pinned: true },
            }),
            conversation({ id: 'recent-1', title: 'Post Call Recap Message' }),
          ],
        })}
      />,
    )

    const pinnedHeader = screen.getByRole('button', { name: 'Pinned' })
    const recentsHeader = screen.getByRole('button', { name: 'Recents' })
    expect(pinnedHeader).toHaveClass('hub-menu-section-label')
    expect(recentsHeader).toHaveClass('hub-menu-section-label')
    expect(
      pinnedHeader.compareDocumentPosition(recentsHeader) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(pinnedHeader.compareDocumentPosition(screen.getByText('ROAS Marketing Strategy'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(
      screen.getByText('ROAS Marketing Strategy').closest('button')?.querySelector('svg'),
    ).toBeNull()
    fireEvent.click(recentsHeader)
    expect(screen.getByText('ROAS Marketing Strategy')).toBeInTheDocument()
    expect(screen.queryByText('Post Call Recap Message')).not.toBeInTheDocument()
  })
})
