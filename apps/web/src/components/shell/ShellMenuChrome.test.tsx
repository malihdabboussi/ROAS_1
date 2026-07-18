import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellSidebarNewButton } from './ShellMenuChrome'
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
