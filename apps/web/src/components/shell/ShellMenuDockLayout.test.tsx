import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShellMenuDockLayout } from './ShellMenuDockLayout'

const mocks = vi.hoisted(() => ({
  desktop: true,
  dock: 'right' as 'left' | 'right' | 'top' | 'bottom',
}))

vi.mock('@/lib/hooks/use-media-query', () => ({
  useMediaQuery: () => mocks.desktop,
}))

vi.mock('./use-shell-prefs-hydrated', () => ({
  useShellPrefsHydrated: () => true,
}))

vi.mock('./use-shell-menu-dock', () => ({
  useShellMenuDock: (selector: (state: { dock: typeof mocks.dock }) => unknown) =>
    selector({ dock: mocks.dock }),
}))

vi.mock('./ShellTopBar', () => ({
  ShellTopBar: () => <header>Top bar</header>,
}))

describe('ShellMenuDockLayout', () => {
  afterEach(() => {
    cleanup()
    mocks.desktop = true
    mocks.dock = 'right'
  })

  it('uses the saved menu edge on desktop', () => {
    const { container } = render(
      <ShellMenuDockLayout sidebar={<nav>Menu</nav>}>
        <div>Workspace</div>
      </ShellMenuDockLayout>,
    )

    expect(container.firstChild).toHaveAttribute('data-shell-menu-dock', 'right')
    expect(screen.getByRole('main').nextElementSibling).toHaveTextContent('Menu')
  })

  it('always mounts the canonical left drawer structure on mobile', () => {
    mocks.desktop = false
    mocks.dock = 'bottom'
    const { container } = render(
      <ShellMenuDockLayout sidebar={<nav>Menu</nav>}>
        <div>Workspace</div>
      </ShellMenuDockLayout>,
    )

    expect(container.firstChild).toHaveAttribute('data-shell-menu-dock', 'left')
    expect(screen.getByText('Menu').nextElementSibling).toHaveRole('main')
  })
})
