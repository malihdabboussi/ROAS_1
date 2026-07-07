'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { AdCanvasFlowNodeData, AdCanvasImagePayload } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function ImageNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasImagePayload

  return (
    <BaseAdCanvasNode {...props} actions={['generate', 'edit', 'variation']} title="Image">
      {payload.image_url ? (
        <img
          src={payload.image_url}
          alt="Generated"
          className="rounded-spacing-1 aspect-[4/5] w-full object-cover"
        />
      ) : (
        <p className="text-muted-foreground line-clamp-3 text-left text-[11px]">
          {payload.prompt?.trim() || 'Generate ad image'}
        </p>
      )}
    </BaseAdCanvasNode>
  )
}

export const ImageNode = memo(ImageNodeComponent)
