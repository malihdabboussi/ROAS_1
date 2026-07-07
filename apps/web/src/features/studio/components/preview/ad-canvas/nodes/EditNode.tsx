'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { AdCanvasEditPayload, AdCanvasFlowNodeData } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function EditNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasEditPayload

  return (
    <BaseAdCanvasNode {...props} actions={['edit']} title="Edit">
      {payload.image_url ? (
        <img
          src={payload.image_url}
          alt="Edit"
          className="rounded-spacing-1 aspect-[4/5] w-full object-cover"
        />
      ) : (
        <p className="text-muted-foreground line-clamp-3 text-left text-[11px]">
          {payload.prompt?.trim() || 'Describe edits'}
        </p>
      )}
    </BaseAdCanvasNode>
  )
}

export const EditNode = memo(EditNodeComponent)
