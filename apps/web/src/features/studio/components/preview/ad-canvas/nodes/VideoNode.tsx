'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Film } from 'lucide-react'
import type { AdCanvasFlowNodeData, AdCanvasVideoPayload } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function VideoNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasVideoPayload

  return (
    <BaseAdCanvasNode {...props} actions={['generate']} title="Video">
      {payload.video_url ? (
        <video
          src={payload.video_url}
          className="rounded-spacing-1 aspect-[9/16] w-full object-cover"
          muted
        />
      ) : (
        <div className="flex items-center gap-2">
          <Film className="text-muted-foreground icon-sm" />
          <p className="text-muted-foreground line-clamp-2 text-left text-[11px]">
            {payload.prompt?.trim() || 'Video creative'}
          </p>
        </div>
      )}
    </BaseAdCanvasNode>
  )
}

export const VideoNode = memo(VideoNodeComponent)
