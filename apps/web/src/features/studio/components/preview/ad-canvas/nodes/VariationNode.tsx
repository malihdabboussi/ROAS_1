'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { AdCanvasFlowNodeData, AdCanvasVariationPayload } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function VariationNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasVariationPayload

  return (
    <BaseAdCanvasNode {...props} actions={['variation']} title="Variation">
      {payload.image_url ? (
        <img
          src={payload.image_url}
          alt="Variation"
          className="rounded-spacing-1 aspect-[4/5] w-full object-cover"
        />
      ) : (
        <p className="text-muted-foreground line-clamp-3 text-left text-[11px]">
          {payload.prompt?.trim() || 'Create a variation'}
        </p>
      )}
    </BaseAdCanvasNode>
  )
}

export const VariationNode = memo(VariationNodeComponent)
