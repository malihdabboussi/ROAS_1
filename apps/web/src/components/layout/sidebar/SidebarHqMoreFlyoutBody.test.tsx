import type { MouseEvent, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SidebarHqMoreFlyoutBody } from './SidebarHqMoreFlyoutBody'
import { makeSidebarHqController } from './SidebarHqSection.test-support'

const programRows = vi.hoisted(() => [
  { id: 'prog-clients', name: 'Clients', system_kind: 'clients' },
  { id: 'prog-ops', name: 'ROAS Ops', system_kind: 'roas_ops' },
])

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: ReactNode
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (
    selector: (state: { setWorkContext: ReturnType<typeof vi.fn> }) => unknown,
  ) => selector({ setWorkContext: vi.fn() }),
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string | null }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

vi.mock('@/lib/programs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/programs')>()
  return {
    ...actual,
    loadProgramsCached: vi.fn(async () => programRows),
    peekProgramsMemoryCache: vi.fn(() => programRows),
    readProgramsLocalCache: vi.fn(() => programRows),
  }
})

vi.mock('./SidebarTeam2Flyout', () => ({
  SidebarTeam2Flyout: () => <div>Previous Team menu</div>,
}))

vi.mock('./SidebarBrainFlyout', () => ({
  SidebarBrainNavLinks: () => <div>Previous Brain menu</div>,
}))

vi.mock('@/components/layout/AvatarAccountMenuPanel', () => ({
  AvatarAccountMenuPanel: () => <div>Account menu</div>,
}))

describe('SidebarHqMoreFlyoutBody', () => {
  afterEach(() => {
    cleanup()
  })

  it('opens the previous Team and Brain menus from their More rows on hover', () => {
    render(
      <SidebarHqMoreFlyoutBody
        c={makeSidebarHqController()}
        showProjects={false}
        onSubFlyoutOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: 'Programs' })).toHaveAttribute('href', '/programs')

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Team' }))
    expect(screen.getByText('Previous Team menu')).toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Brain' }))
    expect(screen.getByText('Previous Brain menu')).toBeInTheDocument()
  })

  it('lists programs on Programs hover', () => {
    render(
      <SidebarHqMoreFlyoutBody
        c={makeSidebarHqController()}
        showProjects={false}
        onSubFlyoutOpenChange={vi.fn()}
      />,
    )

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Programs' }))

    expect(screen.getByRole('link', { name: 'Client Spaces' })).toHaveAttribute(
      'href',
      '/programs/prog-clients',
    )
    expect(screen.getByRole('link', { name: 'ROAS Ops' })).toHaveAttribute(
      'href',
      '/programs/prog-ops',
    )
  })
})
