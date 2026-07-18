import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SidebarConversationMenuPortal } from './SidebarConversationMenuPortal'

afterEach(cleanup)

describe('SidebarConversationMenuPortal', () => {
  it('exposes a named keyboard-dismissible conversation menu', () => {
    const onClose = vi.fn()
    render(
      <SidebarConversationMenuPortal
        conv={{ id: 'conversation-1', title: 'Launch plan' }}
        position={{ top: 10, left: 20 }}
        campaigns={[]}
        moveSubmenuOpenId={null}
        showShare
        onClose={onClose}
        onStartRename={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleMoveSubmenu={vi.fn()}
        onRequestNewCampaign={vi.fn()}
        onMoveToCampaign={vi.fn()}
        onDeleteConversation={vi.fn()}
        onShareConversation={vi.fn()}
      />,
    )

    const menu = screen.getByRole('menu', { name: 'Actions for Launch plan' })
    expect(screen.getByRole('menuitem', { name: 'Share' })).not.toBeNull()
    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
