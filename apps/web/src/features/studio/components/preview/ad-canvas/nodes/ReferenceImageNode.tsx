'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { AdCanvasFlowNodeData, AdCanvasReferenceImagePayload } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function ReferenceImageNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasReferenceImagePayload

  return (
    <BaseAdCanvasNode {...props} title="Reference">
      {payload.image_url ? (
        <img
          src={payload.image_url}
          alt={payload.label ?? 'Reference'}
          className="rounded-spacing-1 aspect-square w-full object-cover"
        />
      ) : (
        <p className="text-muted-foreground text-left text-[11px]">
          Upload or link a reference image
        </p>
      )}
    </BaseAdCanvasNode>
  )
}

export const ReferenceImageNode = memo(ReferenceImageNodeComponent)
