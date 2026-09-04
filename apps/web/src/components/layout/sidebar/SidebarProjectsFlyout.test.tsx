import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeSidebarHqController } from './SidebarHqSection.test-support'
import { SidebarProjectsFlyout } from './SidebarProjectsFlyout'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('SidebarProjectsFlyout', () => {
  afterEach(cleanup)

  it('lists projects and exposes project creation directly', () => {
    const setIsCreatingProject = vi.fn()
    const setNewProjectName = vi.fn()
    const c = makeSidebarHqController({
      sidebarProjects: [{ id: 'project-1', name: 'Campaign App' }],
      setIsCreatingProject,
      setNewProjectName,
    })

    render(
      <SidebarProjectsFlyout
        c={c}
        anchor={new DOMRect(0, 0, 100, 40)}
        onEnter={vi.fn()}
        onLeave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: 'Campaign App' })).toHaveAttribute(
      'href',
      '/projects/project-1',
    )

    fireEvent.click(screen.getByRole('button', { name: 'New project' }))
    expect(setNewProjectName).toHaveBeenCalledWith('')
    expect(setIsCreatingProject).toHaveBeenCalledWith(true)
  })
})
