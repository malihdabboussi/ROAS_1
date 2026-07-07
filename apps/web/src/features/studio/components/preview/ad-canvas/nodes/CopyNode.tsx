'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { AdCanvasCopyPayload, AdCanvasFlowNodeData } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function CopyNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasCopyPayload

  return (
    <BaseAdCanvasNode {...props} actions={['generate']} title="Copy">
      <p className="text-foreground line-clamp-2 text-left font-medium">
        {payload.headline?.trim() || 'Headline'}
      </p>
      <p className="text-muted-foreground mt-spacing-1 line-clamp-3 text-left text-[11px]">
        {payload.primary_text?.trim() || 'Primary text'}
      </p>
    </BaseAdCanvasNode>
  )
}

export const CopyNode = memo(CopyNodeComponent)
