'use client'

import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

function ConversionEdgeComponent(props: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })

  return (
    <BaseEdge
      id={props.id}
      path={edgePath}
      markerEnd={props.markerEnd}
      className="map-edge-stroke"
      style={{ strokeWidth: 2 }}
    />
  )
}

export const ConversionEdge = memo(ConversionEdgeComponent)
