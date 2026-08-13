import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardShell } from './dashboard-shell'

vi.mock('@/components/global-chat/components/QuickMissionsHubHost', () => ({
  QuickMissionsHubHost: () => <div data-testid="quick-missions-host" />,
}))

vi.mock('@/components/shell/ShellWorkspace', () => ({
  ShellWorkspace: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('DashboardShell', () => {
  it('keeps the Quick Missions host mounted for both blank and active chats', () => {
    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>,
    )

    expect(screen.getByTestId('quick-missions-host')).toBeInTheDocument()
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })
})
