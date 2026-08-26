import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellChatHeaderPageControl } from './ShellChatHeaderPageControl'
import { useShellStore } from './use-shell-store'

const mocks = vi.hoisted(() => ({
  pathname: '/home/meetings',
  conv: null as string | null,
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.conv ? `conv=${mocks.conv}` : ''),
}))

describe('ShellChatHeaderPageControl', () => {
  beforeEach(() => {
    mocks.pathname = '/home/meetings'
    mocks.conv = null
    mocks.push.mockReset()
    useShellStore.setState({
      workAreaOpen: true,
      recentWorkAreaPages: [{ id: 'meetings', title: 'Meetings', href: '/home/meetings' }],
      lastWorkAreaPageByConversation: {},
      pendingWorkRestore: null,
      chatDrawer: { open: false, conversationId: null, width: 420, minimized: false },
    })
  })

  afterEach(cleanup)

  it('does not render a page control in chat while the page is open', () => {
    render(<ShellChatHeaderPageControl />)
    expect(screen.queryByRole('button', { name: 'Show page' })).toBeNull()
  })

  it('shows the page from the chat header while the page is collapsed', () => {
    useShellStore.setState({ workAreaOpen: false })
    render(<ShellChatHeaderPageControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Show page' }))
    expect(useShellStore.getState().workAreaOpen).toBe(true)
  })

  it('restores the last work page from a full Home conversation', () => {
    mocks.pathname = '/home'
    mocks.conv = 'conversation-1'
    useShellStore.setState({ workAreaOpen: true })

    render(<ShellChatHeaderPageControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Show page' }))

    expect(useShellStore.getState().chatDrawer.open).toBe(true)
    expect(useShellStore.getState().chatDrawer.conversationId).toBe('conversation-1')
    expect(useShellStore.getState().workAreaOpen).toBe(true)
    expect(mocks.push).toHaveBeenCalledWith('/home/meetings')
  })

  it('prefers the conversation’s remembered meeting page over the global recents list', () => {
    mocks.pathname = '/home'
    mocks.conv = 'conversation-1'
    useShellStore.setState({
      workAreaOpen: true,
      lastWorkAreaPageByConversation: {
        'conversation-1': {
          id: '/home/meetings?meeting=evt-1',
          title: 'Strategy call',
          href: '/home/meetings?meeting=evt-1',
          restore: { feature: 'home_meeting', data: { id: 'evt-1' } },
        },
      },
    })

    render(<ShellChatHeaderPageControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Show page' }))

    expect(useShellStore.getState().pendingWorkRestore).toEqual({
      feature: 'home_meeting',
      data: { id: 'evt-1' },
    })
    expect(mocks.push).toHaveBeenCalledWith('/home/meetings?meeting=evt-1')
  })
})
