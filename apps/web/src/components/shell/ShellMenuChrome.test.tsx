import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellMenuModeToggle, ShellSidebarNewButton } from './ShellMenuChrome'
import { useShellStore } from './use-shell-store'

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push }),
}))

describe('ShellSidebarNewButton', () => {
  beforeEach(() => {
    mocks.pathname = '/home'
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: 'conversation-1', width: 280, minimized: false },
      menuMode: 'home',
      newChatNonce: 0,
      rightPanel: { open: true, tab: 'tasks' },
      spaceWorkOpen: true,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens a fresh docked chat without leaving an open workspace', () => {
    mocks.pathname = '/spaces'

    render(<ShellSidebarNewButton />)
    fireEvent.click(screen.getByRole('button', { name: 'New' }))

    expect(mocks.push).not.toHaveBeenCalled()
    expect(useShellStore.getState().chatDrawer).toMatchObject({
      open: true,
      conversationId: null,
      minimized: false,
    })
    expect(useShellStore.getState().rightPanel.open).toBe(false)
    expect(useShellStore.getState().newChatNonce).toBe(1)
  })

  it('opens the full new-chat screen from Home', () => {
    render(<ShellSidebarNewButton />)
    fireEvent.click(screen.getByRole('button', { name: 'New' }))

    expect(mocks.push).toHaveBeenCalledWith('/home?chat=new')
    expect(useShellStore.getState().chatDrawer.open).toBe(false)
    expect(useShellStore.getState().newChatNonce).toBe(1)
  })
})

describe('ShellMenuModeToggle', () => {
  beforeEach(() => {
    mocks.pathname = '/home'
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: 'conversation-1', width: 280, minimized: false },
      menuMode: 'home',
      newChatNonce: 0,
      rightPanel: { open: true, tab: 'tasks' },
      spaceWorkOpen: true,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('restores the chat drawer when Chat is selected on a workspace with drawer closed', () => {
    mocks.pathname = '/spaces'

    render(<ShellMenuModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))

    expect(useShellStore.getState().menuMode).toBe('chat')
    expect(useShellStore.getState().chatDrawer).toMatchObject({
      open: true,
      conversationId: 'conversation-1',
      minimized: false,
    })
    expect(useShellStore.getState().newChatNonce).toBe(0)
  })

  it('only switches menu mode when Chat is selected and the drawer is already open', () => {
    mocks.pathname = '/spaces'
    useShellStore.setState({
      chatDrawer: { open: true, conversationId: 'conversation-1', width: 280, minimized: false },
      menuMode: 'home',
      newChatNonce: 0,
    })

    render(<ShellMenuModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))

    expect(useShellStore.getState().menuMode).toBe('chat')
    expect(useShellStore.getState().chatDrawer.conversationId).toBe('conversation-1')
    expect(useShellStore.getState().newChatNonce).toBe(0)
  })
})
