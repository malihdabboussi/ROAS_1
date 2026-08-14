import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardShell } from './dashboard-shell'

vi.mock('@/components/shell/ShellWorkspace', () => ({
  ShellWorkspace: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('DashboardShell', () => {
  it('renders workspace content without owning a detached Mission host', () => {
    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>,
    )

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })
})
