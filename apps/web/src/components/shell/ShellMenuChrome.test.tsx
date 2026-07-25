import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellMenuModeToggle } from './ShellMenuChrome'
import { useShellStore } from './use-shell-store'

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push }),
}))

describe('ShellMenuModeToggle', () => {
  beforeEach(() => {
    mocks.pathname = '/home'
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: 'conversation-1', width: 420, minimized: false },
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

  it('switches to Work without opening the chat drawer', () => {
    mocks.pathname = '/spaces'

    render(<ShellMenuModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Work' }))

    expect(useShellStore.getState().menuMode).toBe('work')
    expect(useShellStore.getState().chatDrawer.open).toBe(false)
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('navigates home when Home is selected', () => {
    useShellStore.setState({ menuMode: 'work' })

    render(<ShellMenuModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))

    expect(useShellStore.getState().menuMode).toBe('home')
    expect(mocks.push).toHaveBeenCalledWith('/home')
  })
})
