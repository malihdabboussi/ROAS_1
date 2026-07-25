'use client'

import type { RefObject } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import type { BrainConnection, BrainMemory } from '../types'
import { BrainConstellationLoader } from './BrainConstellationLoader'
import ForceGraph, { type ForceGraphHandle } from './ForceGraph'

interface BrainVisualizationCanvasStageProps {
  activeLoading: boolean
  connections: BrainConnection[]
  error: string | null
  graphRef: RefObject<ForceGraphHandle | null>
  hasActiveGraphData: boolean
  nodes: BrainMemory[]
  nodesMonochrome: boolean
  onNodeClick: (node: BrainMemory | null) => void
  onRetry: () => void
  searchQuery: string
  selectedNodeId: string | null
  viewportKey: string
}

export function BrainVisualizationCanvasStage({
  activeLoading,
  connections,
  error,
  graphRef,
  hasActiveGraphData,
  nodes,
  nodesMonochrome,
  onNodeClick,
  onRetry,
  searchQuery,
  selectedNodeId,
  viewportKey,
}: BrainVisualizationCanvasStageProps) {
  if (error && !hasActiveGraphData) {
    return (
      <div className="gap-spacing-4 text-muted-foreground flex h-full flex-col items-center justify-center">
        <AlertCircle className="text-destructive icon-lg" />
        <p className="body-3">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="button-glass-accent px-spacing-4 py-spacing-2 body-3 gap-spacing-2 flex items-center rounded-lg"
        >
          <RefreshCw className="icon-sm" />
          Retry
        </button>
      </div>
    )
  }

  if (activeLoading && !hasActiveGraphData) {
    return <BrainConstellationLoader />
  }

  return (
    <ForceGraph
      ref={graphRef}
      nodes={nodes}
      connections={connections}
      selectedNodeId={selectedNodeId}
      searchQuery={searchQuery}
      nodesMonochrome={nodesMonochrome}
      viewportKey={viewportKey}
      onNodeClick={onNodeClick}
    />
  )
}
