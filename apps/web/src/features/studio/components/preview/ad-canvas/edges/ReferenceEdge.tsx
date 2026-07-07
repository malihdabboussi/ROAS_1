'use client'

import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'
import type { AdCanvasFlowEdgeData } from '../types/ad-canvas.types'

function ReferenceEdgeComponent(props: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })

  const data = props.data as AdCanvasFlowEdgeData | undefined

  return (
    <BaseEdge
      id={props.id}
      path={edgePath}
      markerEnd={props.markerEnd}
      className="map-edge-stroke"
      style={{
        strokeWidth: 2,
        strokeDasharray: data?.kind === 'reference' ? '6 4' : undefined,
      }}
    />
  )
}

export const ReferenceEdge = memo(ReferenceEdgeComponent)
