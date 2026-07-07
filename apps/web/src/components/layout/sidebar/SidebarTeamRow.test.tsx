import { Profiler, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentTeam } from '@/lib/agents'
import { SidebarTeamRow } from './SidebarTeamRow'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  openInNewTab: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: ReactNode
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
    [key: string]: unknown
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('@/components/ui/IconPicker', () => ({
  getIconColor: () => ({ textColor: 'text-muted-foreground', glassClass: 'surface-card' }),
  IconPicker: ({ customTrigger }: { customTrigger?: ReactNode }) => (
    <button type="button">{customTrigger ?? 'Icon picker'}</button>
  ),
  LucideIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}))

vi.mock('@/lib/utils/open-in-new-tab', () => ({
  openInNewTab: mocks.openInNewTab,
}))

function teamFixture(overrides: Partial<AgentTeam> = {}): AgentTeam {
  return {
    id: 'team-growth',
    org_id: 'org-1',
    user_id: null,
    parent_team_id: null,
    name: 'Growth',
    color: 'default',
    icon: 'users',
    is_system: false,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

function renderTeamRow(overrides: Partial<React.ComponentProps<typeof SidebarTeamRow>> = {}) {
  const props: React.ComponentProps<typeof SidebarTeamRow> = {
    team: teamFixture(),
    isActive: false,
    canEdit: true,
    canManageMembers: true,
    onRename: vi.fn(async (_teamId, name) => teamFixture({ name })),
    onRecolor: vi.fn(async (_teamId, color) => teamFixture({ color })),
    onReicon: vi.fn(async (_teamId, icon) => teamFixture({ icon })),
    onRemove: vi.fn(async () => undefined),
    ...overrides,
  }

  const view = render(<SidebarTeamRow {...props} />)
  return { ...view, props }
}

describe('SidebarTeamRow', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost', pathname: '/team/teams/team-growth' },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => undefined) },
      configurable: true,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the team link and menu actions without route churn', async () => {
    const { props } = renderTeamRow()

    expect(screen.getByRole('link', { name: /growth/i }).getAttribute('href')).toBe(
      '/team/teams/team-growth',
    )

    fireEvent.click(screen.getByRole('button', { name: /team actions/i }))
    fireEvent.click(await screen.findByRole('button', { name: /copy link/i }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'http://localhost/team/teams/team-growth',
      )
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Link copied')
    })
    expect(props.onRename).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('keeps rename behavior and settles without repeated render churn', async () => {
    let commits = 0
    const onRename = vi.fn(async (_teamId: string, name: string) => teamFixture({ name }))

    render(
      <Profiler id="sidebar-team-row" onRender={() => (commits += 1)}>
        <SidebarTeamRow
          team={teamFixture()}
          isActive={false}
          canEdit
          canManageMembers
          onRename={onRename}
          onRecolor={vi.fn(async (_teamId, color) => teamFixture({ color }))}
          onReicon={vi.fn(async (_teamId, icon) => teamFixture({ icon }))}
          onRemove={vi.fn(async () => undefined)}
        />
      </Profiler>,
    )

    fireEvent.click(screen.getByRole('button', { name: /team actions/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /rename/i }))

    const input = screen.getByDisplayValue('Growth')
    fireEvent.change(input, { target: { value: 'Growth Ops' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith('team-growth', 'Growth Ops')
    })
    expect(commits).toBeLessThan(8)
  })
})
