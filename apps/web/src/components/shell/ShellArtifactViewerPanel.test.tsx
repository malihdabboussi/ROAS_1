import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { ShellArtifactViewerPanel } from './ShellArtifactViewerPanel'
import { useShellStore } from './use-shell-store'

vi.mock('./ShellArtifactViewerBrowse', () => ({
  ShellArtifactViewerBrowse: ({ view }: { view: string }) => (
    <div data-testid={`artifact-browse-${view}`} />
  ),
}))

const target: ShellArtifactViewerTarget = {
  id: 'doc-1',
  title: 'Launch brief',
  type: 'doc',
  contextLabel: 'Q3 Launch',
  contextUrl: '/spaces?space=space-1',
  internalUrl: '/spaces?space=space-1&item=doc-1',
}

describe('ShellArtifactViewerPanel', () => {
  beforeEach(() => {
    useShellStore.setState({
      artifactViewer: { target, width: 480 },
      artifactPinned: false,
    })
  })

  afterEach(cleanup)

  it('renders contextual breadcrumbs without replacing the body renderer', () => {
    render(
      <ShellArtifactViewerPanel target={target}>
        <div>Existing renderer</div>
      </ShellArtifactViewerPanel>,
    )

    expect(screen.getByRole('navigation', { name: 'Artifact path' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Q3 Launch' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'files' })).toBeTruthy()
    expect(screen.getByText('Launch brief')).toBeTruthy()
    expect(screen.getByText('Existing renderer')).toBeTruthy()
  })

  it('opens the library and files browsers in the same panel', () => {
    render(
      <ShellArtifactViewerPanel target={target}>
        <div>Existing renderer</div>
      </ShellArtifactViewerPanel>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Q3 Launch' }))
    expect(screen.getByTestId('artifact-browse-library')).toBeTruthy()
    expect(screen.queryByText('Existing renderer')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'files' }))
    expect(screen.getByTestId('artifact-browse-files')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Launch brief' }))
    expect(screen.getByText('Existing renderer')).toBeTruthy()
    expect(screen.queryByTestId('artifact-browse-library')).toBeNull()
  })

  it('renders one canonical open target as a direct action and closes through shell state', () => {
    render(
      <ShellArtifactViewerPanel target={target}>
        <div />
      </ShellArtifactViewerPanel>,
    )

    expect(screen.getByRole('link', { name: 'Open in Space' }).getAttribute('href')).toBe(
      target.internalUrl,
    )
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Close artifact viewer' }))
    expect(useShellStore.getState().artifactViewer.target).toBeNull()
  })

  it('uses the open menu only when there are multiple targets', () => {
    const multiTarget = { ...target, fileUrl: 'https://example.com/brief.pdf' }
    render(
      <ShellArtifactViewerPanel target={multiTarget}>
        <div />
      </ShellArtifactViewerPanel>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('link', { name: 'Open in Space' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open file' })).toBeTruthy()
  })

  it('expands the slide-out into a full-screen document workspace', () => {
    const { container } = render(
      <ShellArtifactViewerPanel target={target}>
        <div>Document body</div>
      </ShellArtifactViewerPanel>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Expand artifact viewer' }))

    expect(container.querySelector('[data-shell-artifact-viewer]')?.className).toContain('absolute')
    const controls = screen.getByTestId('artifact-viewer-controls')
    const collapse = screen.getByRole('button', { name: 'Collapse artifact viewer' })
    expect(controls).toContainElement(collapse)
    expect(collapse.querySelector('.lucide-minimize-2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Close artifact viewer' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse artifact viewer' }))
    expect(container.querySelector('[data-shell-artifact-viewer]')?.className).not.toContain(
      'absolute',
    )
    expect(useShellStore.getState().artifactViewer.target).toEqual(target)
  })

  it('toggles artifact pin from the viewer controls', () => {
    render(
      <ShellArtifactViewerPanel target={target}>
        <div />
      </ShellArtifactViewerPanel>,
    )

    fireEvent.click(screen.getByTestId('artifact-viewer-pin'))
    expect(useShellStore.getState().artifactPinned).toBe(true)
    fireEvent.click(screen.getByTestId('artifact-viewer-pin'))
    expect(useShellStore.getState().artifactPinned).toBe(false)
  })

  it('gives the title all remaining toolbar space without shrinking controls', () => {
    render(
      <ShellArtifactViewerPanel
        target={{ ...target, title: 'A very long artifact title that must truncate first' }}
        actions={<button type="button">Toolbar action</button>}
      >
        <div />
      </ShellArtifactViewerPanel>,
    )

    expect(screen.getByRole('navigation', { name: 'Artifact path' })).toHaveClass(
      'min-w-0',
      'flex-1',
      'truncate',
    )
    expect(screen.getByRole('button', { name: 'Expand artifact viewer' })).toHaveClass('shrink-0')
    expect(screen.getByRole('button', { name: 'Close artifact viewer' })).toHaveClass('shrink-0')
  })
})
