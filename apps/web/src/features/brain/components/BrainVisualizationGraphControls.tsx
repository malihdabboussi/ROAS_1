'use client'

import type { ComponentProps, RefObject } from 'react'
import LegendPanel from './LegendPanel'
import NavControls from './NavControls'
import type { ForceGraphHandle } from './ForceGraph'

type LegendPanelProps = ComponentProps<typeof LegendPanel>

type BrainVisualizationGraphLegendProps = Omit<
  LegendPanelProps,
  'beliefCount' | 'leadingSlot' | 'perspectiveCount'
> & {
  beliefCount?: number
  perspectiveCount?: number
  showCognitionCounts?: boolean
}

interface BrainVisualizationGraphControlsProps {
  graphRef: RefObject<ForceGraphHandle | null>
  legend: BrainVisualizationGraphLegendProps
  nodesMonochrome: boolean
  onToggleNodesMonochrome: () => void
}

export function BrainVisualizationGraphControls({
  graphRef,
  legend,
  nodesMonochrome,
  onToggleNodesMonochrome,
}: BrainVisualizationGraphControlsProps) {
  const {
    beliefCount,
    perspectiveCount,
    showCognitionCounts,
    ...legendProps
  } = legend

  return (
    <>
      <div className="hidden md:block">
        <NavControls
          onZoomIn={() => graphRef.current?.zoomIn()}
          onZoomOut={() => graphRef.current?.zoomOut()}
          onCenter={() => graphRef.current?.center()}
          onOrganize={(layout) => graphRef.current?.organize(layout)}
          nodesMonochrome={nodesMonochrome}
          onToggleNodesMonochrome={onToggleNodesMonochrome}
        />
      </div>

      <div className="hidden md:block">
        <LegendPanel
          {...legendProps}
          beliefCount={showCognitionCounts ? beliefCount : undefined}
          perspectiveCount={showCognitionCounts ? perspectiveCount : undefined}
          leadingSlot={null}
        />
      </div>
    </>
  )
}
