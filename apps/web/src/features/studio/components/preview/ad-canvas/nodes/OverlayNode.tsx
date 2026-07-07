'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { AdCanvasFlowNodeData, AdCanvasOverlayPayload } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function OverlayNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasOverlayPayload

  return (
    <BaseAdCanvasNode {...props} title="Overlay">
      <p className="text-foreground emphasis-medium line-clamp-3 text-center text-sm">
        {payload.text?.trim() || 'Overlay text'}
      </p>
    </BaseAdCanvasNode>
  )
}

export const OverlayNode = memo(OverlayNodeComponent)
