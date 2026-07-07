'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Megaphone } from 'lucide-react'
import type { AdCanvasAdPayload, AdCanvasFlowNodeData } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function AdNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasAdPayload
  const adId = d.ad_id ?? payload.ad_id

  return (
    <BaseAdCanvasNode {...props} title="Ad">
      <div className="flex items-center gap-2">
        <Megaphone className="text-primary icon-sm" />
        <span className="body-3 text-foreground truncate">
          {adId ? 'Linked ad' : 'Promote to ad'}
        </span>
      </div>
    </BaseAdCanvasNode>
  )
}

export const AdNode = memo(AdNodeComponent)
