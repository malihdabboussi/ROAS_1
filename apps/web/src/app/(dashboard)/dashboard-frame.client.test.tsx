import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardFrame } from './dashboard-frame.client'

vi.mock('@/components/shell/ShellMenuDockLayout', () => ({
  ShellMenuDockLayout: () => {
    throw new Promise(() => undefined)
  },
}))
vi.mock('@/components/shell/ShellOpenInProvider', () => ({
  ShellOpenInProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('DashboardFrame', () => {
  it('does not add a second top bar while the dashboard frame is loading', () => {
    const { container } = render(
      <DashboardFrame sidebar={<nav>Menu</nav>}>
        <header className="shell-topbar">Inbox</header>
      </DashboardFrame>,
    )

    expect(container.querySelectorAll('.shell-topbar')).toHaveLength(1)
  })
})
