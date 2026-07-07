import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChannelActionsMenu } from './ChannelActionsMenu'

const iconMocks = vi.hoisted(() => ({
  onIconChange: vi.fn(),
  onColorChange: vi.fn(),
}))

vi.mock('@/components/ui/IconPicker', () => ({
  getIconColor: () => ({ textColor: 'text-primary' }),
  IconPicker: ({
    customTrigger,
    onChange,
    onColorChange,
  }: {
    customTrigger: React.ReactNode
    onChange: (name: string) => void
    onColorChange: (color: string) => void
  }) => (
    <button
      type="button"
      onClick={() => {
        iconMocks.onIconChange()
        iconMocks.onColorChange()
        onChange('sparkles')
        onColorChange('default')
      }}
    >
      {customTrigger}
    </button>
  ),
  LucideIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}))

function renderMenu(
  props: Partial<React.ComponentProps<typeof ChannelActionsMenu>> = {},
  handlers = {
    onClose: vi.fn(),
    onCopyLink: vi.fn(),
    onOpenInNewTab: vi.fn(),
    onMarkAsRead: vi.fn(),
    onToggleFavorite: vi.fn(),
    onRename: vi.fn(),
    onAddMembers: vi.fn(),
    onOpenSettings: vi.fn(),
    onPatchIcon: vi.fn(),
    onStartBrainstorm: vi.fn(),
    onUnpinFromView: vi.fn(),
    onDelete: vi.fn(),
  },
) {
  render(
    <ChannelActionsMenu
      open
      anchor={{ top: 12, left: 20 }}
      channelName="alpha"
      canManage
      onClose={handlers.onClose}
      onCopyLink={handlers.onCopyLink}
      onOpenInNewTab={handlers.onOpenInNewTab}
      onMarkAsRead={handlers.onMarkAsRead}
      isFavorite={false}
      onToggleFavorite={handlers.onToggleFavorite}
      onRename={handlers.onRename}
      onAddMembers={handlers.onAddMembers}
      onOpenSettings={handlers.onOpenSettings}
      channelIconName="hash"
      channelIconColorId="default"
      onPatchIcon={handlers.onPatchIcon}
      onStartBrainstorm={handlers.onStartBrainstorm}
      onDelete={handlers.onDelete}
      {...props}
    />,
  )
  return handlers
}

describe('ChannelActionsMenu', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders manager actions and closes after command callbacks', () => {
    const handlers = renderMenu()

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))
    expect(handlers.onCopyLink).toHaveBeenCalledTimes(1)
    expect(handlers.onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('menuitem', { name: /rename/i }))
    expect(handlers.onRename).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('menuitem', { name: /add members/i }))
    expect(handlers.onAddMembers).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /color & icon/i }))
    expect(handlers.onPatchIcon).toHaveBeenCalledWith({ icon: 'sparkles' })
    expect(handlers.onPatchIcon).toHaveBeenCalledWith({ icon_color: 'default' })

    fireEvent.click(screen.getByRole('menuitem', { name: /delete channel/i }))
    expect(handlers.onDelete).toHaveBeenCalledTimes(1)
  })

  it('hides manager actions for non-managers and shows unpin action when requested', () => {
    const handlers = renderMenu({
      canManage: false,
      showUnpinFromView: true,
      onUnpinFromView: undefined,
    })

    expect(screen.queryByRole('menuitem', { name: /rename/i })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /delete channel/i })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /remove from view/i })).toBeNull()

    cleanup()
    renderMenu({
      showUnpinFromView: true,
      onUnpinFromView: handlers.onUnpinFromView,
    })
    fireEvent.click(screen.getByRole('menuitem', { name: /remove from view/i }))
    expect(handlers.onUnpinFromView).toHaveBeenCalledTimes(1)
  })
})
