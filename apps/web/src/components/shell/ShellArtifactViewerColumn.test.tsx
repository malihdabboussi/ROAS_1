import type { MouseEvent } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellArtifactViewerColumn } from './ShellArtifactViewerColumn'
import { useShellStore } from './use-shell-store'

vi.mock('@/components/layout/ResizableDivider', () => ({
  ResizableDivider: ({
    onMouseDown,
    ariaLabel,
  }: {
    onMouseDown: (event: MouseEvent) => void
    ariaLabel?: string
  }) => <button type="button" aria-label={ariaLabel} onMouseDown={onMouseDown} />,
}))

describe('ShellArtifactViewerColumn', () => {
  beforeEach(() => {
    useShellStore.setState({
      artifactViewer: {
        target: { id: 'artifact-1', title: 'Launch brief', type: 'doc' },
        width: 480,
      },
    })
  })

  afterEach(cleanup)

  it('renders the third pane at its persisted width and lets the divider move it', () => {
    render(
      <ShellArtifactViewerColumn besideConversation>
        <div>Artifact body</div>
      </ShellArtifactViewerColumn>,
    )

    const column = screen.getByTestId('shell-artifact-viewer-column')
    expect(column).toHaveStyle({ width: '480px' })

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize artifact viewer' }), {
      clientX: 800,
    })
    const moveEvent = new Event('pointermove', { bubbles: true })
    Object.defineProperty(moveEvent, 'clientX', { value: 700 })
    fireEvent(document, moveEvent)

    expect(useShellStore.getState().artifactViewer.width).toBe(580)
    fireEvent.pointerUp(document)
  })

  it('omits the resize divider when the artifact replaces the work area', () => {
    render(
      <ShellArtifactViewerColumn besideConversation={false}>
        <div>Artifact body</div>
      </ShellArtifactViewerColumn>,
    )

    expect(screen.queryByRole('button', { name: 'Resize artifact viewer' })).toBeNull()
    expect(screen.getByTestId('shell-artifact-viewer-column')).toHaveClass('flex-1')
  })
})
