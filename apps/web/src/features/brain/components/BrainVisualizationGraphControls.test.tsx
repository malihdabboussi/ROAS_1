import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrainVisualizationGraphControls } from './BrainVisualizationGraphControls'

const mocks = vi.hoisted(() => ({
  legendPanel: vi.fn(),
  navControls: vi.fn(),
}))

vi.mock('./LegendPanel', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.legendPanel(props)
    return <div data-testid="legend-panel">{String(props.scopeType)}</div>
  },
}))

vi.mock('./NavControls', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.navControls(props)
    return (
      <div data-testid="nav-controls" data-monochrome={String(props.nodesMonochrome)}>
        <button type="button" onClick={props.onZoomIn as () => void}>
          Zoom in
        </button>
        <button type="button" onClick={props.onZoomOut as () => void}>
          Zoom out
        </button>
        <button type="button" onClick={props.onCenter as () => void}>
          Center
        </button>
        <button
          type="button"
          onClick={() => (props.onOrganize as (layout: string) => void)('time')}
        >
          Organize time
        </button>
        <button type="button" onClick={props.onToggleNodesMonochrome as () => void}>
          Toggle monochrome
        </button>
      </div>
    )
  },
}))

describe('BrainVisualizationGraphControls', () => {
  it('wires desktop nav controls to the graph handle and monochrome toggle', () => {
    const graphHandle = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      fit: vi.fn(),
      center: vi.fn(),
      organize: vi.fn(),
    }
    const onToggleNodesMonochrome = vi.fn()

    render(
      <BrainVisualizationGraphControls
        graphRef={{ current: graphHandle }}
        nodesMonochrome
        onToggleNodesMonochrome={onToggleNodesMonochrome}
        legend={{
          memoryCounts: { fact: 2 },
          snapshotCounts: { Model: 1 },
          memoryCount: 2,
          experienceCount: 1,
          snapshotCount: 1,
          skEntryCount: 0,
          connectionCounts: { related_to: 3 },
          domainCounts: { strategy: 1 },
          sourceCounts: { note: 2 },
          connections: [],
          scopeType: 'user',
          isAgentBrain: false,
          brainId: 'brain-user',
          showCognitionCounts: true,
          beliefCount: 4,
          perspectiveCount: 5,
        }}
      />,
    )

    expect(screen.getByTestId('nav-controls').getAttribute('data-monochrome')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    fireEvent.click(screen.getByRole('button', { name: 'Center' }))
    fireEvent.click(screen.getByRole('button', { name: 'Organize time' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle monochrome' }))

    expect(graphHandle.zoomIn).toHaveBeenCalledTimes(1)
    expect(graphHandle.zoomOut).toHaveBeenCalledTimes(1)
    expect(graphHandle.center).toHaveBeenCalledTimes(1)
    expect(graphHandle.organize).toHaveBeenCalledWith('time')
    expect(onToggleNodesMonochrome).toHaveBeenCalledTimes(1)
  })

  it('passes legend counts and normalized cognition visibility to the legend panel', () => {
    render(
      <BrainVisualizationGraphControls
        graphRef={{ current: null }}
        nodesMonochrome={false}
        onToggleNodesMonochrome={vi.fn()}
        legend={{
          memoryCounts: { insight: 6 },
          snapshotCounts: { Model: 2 },
          memoryCount: 6,
          experienceCount: 2,
          snapshotCount: 2,
          skEntryCount: 1,
          connectionCounts: { supports: 4 },
          domainCounts: { finance: 1 },
          sourceCounts: { upload: 3 },
          connections: [],
          scopeType: 'agent',
          isAgentBrain: true,
          brainId: 'brain-agent',
          showCognitionCounts: false,
          beliefCount: 7,
          perspectiveCount: 8,
        }}
      />,
    )

    expect(mocks.legendPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryCounts: { insight: 6 },
        snapshotCounts: { Model: 2 },
        memoryCount: 6,
        experienceCount: 2,
        snapshotCount: 2,
        skEntryCount: 1,
        connectionCounts: { supports: 4 },
        domainCounts: { finance: 1 },
        sourceCounts: { upload: 3 },
        connections: [],
        scopeType: 'agent',
        isAgentBrain: true,
        brainId: 'brain-agent',
        beliefCount: undefined,
        perspectiveCount: undefined,
        leadingSlot: null,
      }),
    )
  })
})
