'use client'

import { memo, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import { Trash2 } from 'lucide-react'
import type { WorkflowFlowEdgeData } from '../workflow-flow-transform'

function WorkflowEdgeComponent(props: EdgeProps) {
  const data = props.data as WorkflowFlowEdgeData | undefined
  const [isHovered, setIsHovered] = useState(false)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })

  const edgeClassName = data?.status === 'invalid' ? 'map-edge-stroke-error' : 'map-edge-stroke'

  if (!data) {
    return <BaseEdge id={props.id} path={edgePath} className="map-edge-stroke" />
  }

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.dispatchEvent(
      new CustomEvent('workflow-canvas:delete-edge', {
        detail: { edgeId: data.workflow_edge_id, edgeType: data.edge_type },
      }),
    )
  }

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={28}
        className="nodrag nopan"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      <BaseEdge
        id={props.id}
        path={edgePath}
        markerEnd={props.markerEnd}
        className={edgeClassName}
        style={{ strokeWidth: data.status === 'paused' ? 1.5 : 2, pointerEvents: 'none' }}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            width: 140,
            height: 40,
            pointerEvents: 'all',
          }}
        >
          {isHovered && (
            <div className="flex h-full w-full items-center justify-center">
              <button
                type="button"
                onClick={onDelete}
                className="btn-icon-glass-sm"
                title="Delete connection"
              >
                <Trash2 className="icon-xs" />
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const WorkflowEdge = memo(WorkflowEdgeComponent)
