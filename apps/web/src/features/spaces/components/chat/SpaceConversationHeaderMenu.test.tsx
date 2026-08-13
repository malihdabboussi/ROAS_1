import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Conversation } from '@/lib/conversations'
import { SpaceConversationHeaderMenu } from './SpaceConversationHeaderMenu'

const surfaceProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))

vi.mock('@/components/conversations/SpaceConversationActionsSurface', () => ({
  SpaceConversationActionsSurface: (props: Record<string, unknown>) => {
    surfaceProps.current = props
    return props.menuConversation ? <div role="menu">Conversation menu</div> : null
  },
}))

const conversation = {
  id: 'conversation-1',
  title: 'Launch plan',
  campaign_id: null,
  metadata: {},
  status: 'active',
} as Conversation

describe('SpaceConversationHeaderMenu', () => {
  afterEach(cleanup)

  it('opens the canonical conversation menu from the header details button', () => {
    render(
      <SpaceConversationHeaderMenu
        conversation={conversation}
        isOrgContext
        onRenameRequested={vi.fn()}
        onCopyConversationLink={vi.fn()}
        onCopyConversationId={vi.fn()}
        onOpenConversationInNewTab={vi.fn()}
        onShareConversation={vi.fn()}
        onTogglePinConversation={vi.fn()}
        onToggleArchiveConversation={vi.fn()}
        onMoveConversation={vi.fn()}
        onDuplicateConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Conversation details' }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(surfaceProps.current?.menuConversation).toBe(conversation)
  })
})
