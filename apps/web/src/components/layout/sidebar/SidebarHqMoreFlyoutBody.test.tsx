import type { MouseEvent, ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarHqMoreFlyoutBody } from './SidebarHqMoreFlyoutBody'
import { makeSidebarHqController } from './SidebarHqSection.test-support'

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
  it('opens the previous Team and Brain menus from their More rows on hover', () => {
    render(
      <SidebarHqMoreFlyoutBody
        c={makeSidebarHqController()}
        showProjects={false}
        onSubFlyoutOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: 'Programs' })).toHaveAttribute('href', '/campaigns')

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Team' }))
    expect(screen.getByText('Previous Team menu')).toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Brain' }))
    expect(screen.getByText('Previous Brain menu')).toBeInTheDocument()
  })
})
