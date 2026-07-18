import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { ShellArtifactViewerPanel } from './ShellArtifactViewerPanel'
import { useShellStore } from './use-shell-store'

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
    useShellStore.setState({ artifactViewer: { target, width: 480 } })
  })

  afterEach(cleanup)

  it('renders contextual breadcrumbs without replacing the body renderer', () => {
    render(
      <ShellArtifactViewerPanel target={target}>
        <div>Existing renderer</div>
      </ShellArtifactViewerPanel>,
    )

    expect(screen.getByRole('link', { name: 'Q3 Launch' })).toHaveAttribute(
      'href',
      target.contextUrl,
    )
    expect(screen.getByText('/ files /')).toBeTruthy()
    expect(screen.getByText('Launch brief')).toBeTruthy()
    expect(screen.getByText('Existing renderer')).toBeTruthy()
  })

  it('renders one canonical open target as a direct action and closes through shell state', () => {
    render(
      <ShellArtifactViewerPanel target={target}>
        <div />
      </ShellArtifactViewerPanel>,
    )

    expect(screen.getByRole('link', { name: 'Open in Space' })).toHaveAttribute(
      'href',
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

    expect(container.querySelector('[data-shell-artifact-viewer]')?.className).toContain('fixed')
    expect(screen.getByRole('button', { name: 'Collapse artifact viewer' })).toBeTruthy()
  })
})
