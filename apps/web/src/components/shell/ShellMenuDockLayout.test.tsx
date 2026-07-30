import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShellMenuDockLayout } from './ShellMenuDockLayout'

const mocks = vi.hoisted(() => ({
  desktop: true,
  dock: 'left' as 'left' | 'work' | 'work-top' | 'work-bottom' | 'work-right',
  workCardHostAvailable: false,
  workCollapsedHostAvailable: false,
  chatOpen: true,
  portalActive: false,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'surface' && mocks.portalActive ? 'portal' : null),
  }),
}))

vi.mock('@/lib/hooks/use-media-query', () => ({
  useMediaQuery: () => mocks.desktop,
}))

vi.mock('./use-shell-prefs-hydrated', () => ({
  useShellPrefsHydrated: () => true,
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: (selector: (state: { chatDrawer: { open: boolean } }) => unknown) =>
    selector({ chatDrawer: { open: mocks.chatOpen } }),
}))

vi.mock('./use-shell-menu-dock', async () => {
  const actual =
    await vi.importActual<typeof import('./use-shell-menu-dock')>('./use-shell-menu-dock')
  return {
    ...actual,
    useActiveShellMenuDock: () => mocks.dock,
    useShellMenuDock: (
      selector: (state: {
        dock: typeof mocks.dock
        candidate: typeof mocks.dock
        dragging: boolean
        workCardHostAvailable: boolean
        workCollapsedHostAvailable: boolean
      }) => unknown,
    ) =>
      selector({
        dock: mocks.dock,
        candidate: mocks.dock,
        dragging: false,
        workCardHostAvailable: mocks.workCardHostAvailable,
        workCollapsedHostAvailable: mocks.workCollapsedHostAvailable,
      }),
  }
})

vi.mock('./ShellTopBar', () => ({
  ShellTopBar: () => <header>Top bar</header>,
}))

describe('ShellMenuDockLayout', () => {
  afterEach(() => {
    cleanup()
    mocks.desktop = true
    mocks.dock = 'left'
    mocks.workCardHostAvailable = false
    mocks.workCollapsedHostAvailable = false
    mocks.chatOpen = true
    mocks.portalActive = false
  })

  it('mounts the menu on the far left of chat', () => {
    const { container } = render(
      <ShellMenuDockLayout sidebar={<nav>Menu</nav>}>
        <div>Workspace</div>
      </ShellMenuDockLayout>,
    )

    expect(container.firstChild).toHaveAttribute('data-shell-menu-dock', 'left')
    expect(screen.getByText('Menu').nextElementSibling).toHaveRole('main')
  })

  it('remaps frame left onto work when chat is closed and work can host', () => {
    mocks.chatOpen = false
    mocks.workCardHostAvailable = true
    const { container } = render(
      <ShellMenuDockLayout sidebar={<nav>Menu</nav>}>
        <div>Workspace</div>
      </ShellMenuDockLayout>,
    )

    expect(container.firstChild).toHaveAttribute('data-shell-menu-dock', 'work')
    expect(screen.queryByText('Menu')).toBeNull()
  })

  it('omits the frame sidebar when work dock is hosted in the workspace', () => {
    mocks.dock = 'work'
    mocks.workCardHostAvailable = true
    const { container } = render(
      <ShellMenuDockLayout sidebar={<nav>Menu</nav>}>
        <div>Workspace</div>
      </ShellMenuDockLayout>,
    )

    expect(container.firstChild).toHaveAttribute('data-shell-menu-dock', 'work')
    expect(screen.queryByText('Menu')).toBeNull()
  })

  it('falls back to frame left when work dock cannot host', () => {
    mocks.dock = 'work-top'
    mocks.workCardHostAvailable = false
    mocks.workCollapsedHostAvailable = false
    render(
      <ShellMenuDockLayout sidebar={<nav>Menu</nav>}>
        <div>Workspace</div>
      </ShellMenuDockLayout>,
    )

    expect(screen.getByText('Menu').nextElementSibling).toHaveRole('main')
  })

  it('hides the workspace menu while the Portal surface is active', () => {
    mocks.portalActive = true

    render(
      <ShellMenuDockLayout sidebar={<nav>Menu</nav>}>
        <div>Portal</div>
      </ShellMenuDockLayout>,
    )

    expect(screen.queryByText('Menu')).toBeNull()
    expect(screen.getByText('Portal')).toBeInTheDocument()
  })
})
