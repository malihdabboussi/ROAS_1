import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { ShellWorkAreaControl } from './ShellWorkAreaControl'
import { useShellStore } from './use-shell-store'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const target: ShellArtifactViewerTarget = {
  id: 'image-1',
  title: 'Campaign image',
  type: 'image',
  mediaAssetId: 'image-1',
}

const currentPage = { id: '/home', title: 'Agenda', href: '/home' }
const previousPage = { id: '/team/skills', title: 'Skills', href: '/team/skills' }

describe('ShellWorkAreaControl', () => {
  beforeEach(() => {
    push.mockReset()
    useShellStore.setState({
      workAreaOpen: true,
      artifactViewer: { target, width: 480 },
      recentArtifactTargets: [target],
      recentWorkAreaPages: [currentPage, previousPage],
    })
  })

  afterEach(cleanup)

  it('keeps the active surface available while collapsing and restoring it', () => {
    render(<ShellWorkAreaControl currentPage={currentPage} />)

    fireEvent.click(screen.getByRole('button', { name: 'Collapse page — chat full screen' }))
    expect(useShellStore.getState().workAreaOpen).toBe(false)
    expect(useShellStore.getState().artifactViewer.target).toEqual(target)

    fireEvent.click(screen.getByRole('button', { name: 'Show page' }))
    expect(useShellStore.getState().workAreaOpen).toBe(true)
    expect(useShellStore.getState().artifactViewer.target).toEqual(target)
  })

  it('names recent pages and restores a selected page', () => {
    const meeting = {
      id: 'home-meeting:google:evt-1',
      title: 'Aaron x Dylan x Nate',
      href: '/home',
      restore: {
        feature: 'home_meeting',
        data: { id: 'evt-1', title: 'Aaron x Dylan x Nate' },
      },
    }
    useShellStore.setState({
      workAreaOpen: true,
      artifactViewer: { target, width: 480 },
      recentArtifactTargets: [target],
      recentWorkAreaPages: [currentPage, meeting, previousPage],
      pendingWorkRestore: null,
    })
    render(<ShellWorkAreaControl currentPage={currentPage} />)

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Collapse page — chat full screen' }))
    expect(screen.getByRole('menu', { name: 'Recent work surfaces' })).toHaveClass('w-spacing-64')
    expect(screen.getByRole('menuitem', { name: 'Agenda' })).toHaveClass('text-left')
    expect(screen.getByRole('menuitem', { name: 'Aaron x Dylan x Nate' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Skills' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Campaign image' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Aaron x Dylan x Nate' }))
    expect(useShellStore.getState().artifactViewer.target).toBeNull()
    expect(useShellStore.getState().workAreaOpen).toBe(true)
    expect(useShellStore.getState().pendingWorkRestore).toEqual(meeting.restore)
    expect(push).not.toHaveBeenCalled()
  })

  it('navigates to a different named page from history', () => {
    render(<ShellWorkAreaControl currentPage={currentPage} />)

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Collapse page — chat full screen' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Skills' }))
    expect(useShellStore.getState().artifactViewer.target).toBeNull()
    expect(useShellStore.getState().workAreaOpen).toBe(true)
    expect(push).toHaveBeenCalledWith('/team/skills')
  })

  it('leaves an in-flight restore payload alone when a payload-less entry is picked', () => {
    const pending = { feature: 'home_meeting', data: { id: 'evt-1' } }
    useShellStore.setState({ pendingWorkRestore: pending })
    render(<ShellWorkAreaControl currentPage={currentPage} />)

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Collapse page — chat full screen' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Skills' }))

    expect(useShellStore.getState().pendingWorkRestore).toEqual(pending)
  })
})
