'use client'

import { useCallback } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { OnEdgesChange, OnNodesChange } from '@xyflow/react'
import { AlertCircle } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { adCanvasEdgeTypes } from './edges'
import { adCanvasNodeTypes } from './nodes'
import type { AdCanvasFlowEdge, AdCanvasFlowNode } from './types/ad-canvas.types'

export interface AdCanvasProps {
  loading: boolean
  error: string | null
  nodes: AdCanvasFlowNode[]
  edges: AdCanvasFlowEdge[]
  onNodesChange: OnNodesChange<AdCanvasFlowNode>
  onEdgesChange: OnEdgesChange<AdCanvasFlowEdge>
  onNodeSelect: (nodeId: string | null) => void
  onMoveEnd?: () => void
}

export function AdCanvas({
  loading,
  error,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onMoveEnd,
}: AdCanvasProps) {
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeSelect(node.id)
    },
    [onNodeSelect],
  )

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null)
  }, [onNodeSelect])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading creative canvas..." />
      </div>
    )
  }

  return (
    <div className="react-flow-container-optimized relative h-full min-h-0 flex-1">
      {error ? (
        <div className="border-border absolute left-4 right-4 top-4 z-10 rounded-lg border px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-destructive/80 mt-0.5 h-4 w-4 shrink-0" />
            <p className="body-3 text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes as AdCanvasFlowNode[]}
        edges={edges as AdCanvasFlowEdge[]}
        nodeTypes={adCanvasNodeTypes}
        edgeTypes={adCanvasEdgeTypes}
        onNodesChange={onNodesChange as never}
        onEdgesChange={onEdgesChange as never}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onMoveEnd={onMoveEnd}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        panOnDrag={[1, 2]}
        panOnScroll
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border)"
          className="opacity-30"
        />
        <Controls className="card-glass border-border rounded-spacing-2 border" />
      </ReactFlow>
    </div>
  )
}
