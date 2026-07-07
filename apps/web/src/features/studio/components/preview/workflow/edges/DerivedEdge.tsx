'use client'

import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

function DerivedEdgeComponent(props: EdgeProps) {
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
      style={{ strokeWidth: 1.5, strokeDasharray: '6 4', opacity: 0.6, pointerEvents: 'none' }}
    />
  )
}

export const DerivedEdge = memo(DerivedEdgeComponent)
