'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { LayoutGrid } from 'lucide-react'
import type { AdCanvasCarouselPayload, AdCanvasFlowNodeData } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function CarouselNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasCarouselPayload
  const count = payload.cards?.length ?? 0

  return (
    <BaseAdCanvasNode {...props} actions={['generate']} title="Carousel">
      <div className="flex items-center gap-2">
        <LayoutGrid className="text-muted-foreground icon-sm" />
        <span className="body-3 text-muted-foreground">
          {count} card{count !== 1 ? 's' : ''}
        </span>
      </div>
    </BaseAdCanvasNode>
  )
}

export const CarouselNode = memo(CarouselNodeComponent)
