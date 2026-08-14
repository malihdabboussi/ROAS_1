import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { ShellMissionArtifactViewerAdapter } from './ShellMissionArtifactViewerAdapter'
import { useShellStore } from './use-shell-store'

const mocks = vi.hoisted(() => ({
  fetchMissionById: vi.fn(),
}))

vi.mock('@/lib/missions', () => ({
  fetchMissionById: mocks.fetchMissionById,
}))

vi.mock('@/components/missions/MissionDetailModalAdapter', () => ({
  MissionDetailModal: (props: Record<string, unknown>) => (
    <div data-testid="mission-detail">
      {props.headerActions as ReactNode}
      <button type="button" onClick={props.onClose as () => void}>
        Close mission
      </button>
    </div>
  ),
}))

const target: ShellArtifactViewerTarget = {
  id: 'mission-1',
  entityId: 'mission-1',
  title: 'Client Strategy',
  type: 'mission',
}

describe('ShellMissionArtifactViewerAdapter', () => {
  beforeEach(() => {
    mocks.fetchMissionById.mockResolvedValue({ id: 'mission-1', title: 'Client Strategy' })
    useShellStore.setState({ artifactViewer: { target, width: 480 } })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('expands and collapses Mission details from the Mission header controls', async () => {
    const { container } = render(<ShellMissionArtifactViewerAdapter target={target} />)

    expect(await screen.findByTestId('mission-detail')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Expand mission viewer' }))

    expect(container.querySelector('[data-shell-mission-artifact-viewer]')?.className).toContain(
      'absolute',
    )
    expect(screen.getByRole('button', { name: 'Collapse mission viewer' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse mission viewer' }))
    expect(
      container.querySelector('[data-shell-mission-artifact-viewer]')?.className,
    ).not.toContain('absolute')
  })

  it('keeps the existing Mission close action wired to the shell viewer', async () => {
    render(<ShellMissionArtifactViewerAdapter target={target} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Close mission' }))

    expect(useShellStore.getState().artifactViewer.target).toBeNull()
  })
})
