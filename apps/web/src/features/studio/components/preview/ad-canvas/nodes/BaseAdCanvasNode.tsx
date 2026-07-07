'use client'

import type { ReactNode } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Loader2 } from 'lucide-react'
import type { AdCanvasFlowNodeData, AdCanvasNodeAction } from '../types/ad-canvas.types'

const KIND_LABELS: Record<AdCanvasFlowNodeData['kind'], string> = {
  brief: 'Brief',
  strategy: 'Strategy',
  reference_image: 'Reference',
  image: 'Image',
  edit: 'Edit',
  variation: 'Variation',
  copy: 'Copy',
  carousel: 'Carousel',
  video: 'Video',
  overlay: 'Overlay',
  ad: 'Ad',
}

const STATUS_CLASS: Record<AdCanvasFlowNodeData['status'], string> = {
  idle: 'badge-glass-muted',
  generating: 'badge-glass-blue',
  ready: 'badge-glass-green',
  error: 'badge-glass-red',
}

export interface BaseAdCanvasNodeProps extends NodeProps {
  title?: string
  children?: ReactNode
  actions?: AdCanvasNodeAction[]
  onAction?: (action: AdCanvasNodeAction) => void
  sourcePicker?: ReactNode
  wide?: boolean
  hideHeader?: boolean
}

export function BaseAdCanvasNode({
  data,
  selected,
  title,
  children,
  actions = [],
  onAction,
  sourcePicker,
  wide = false,
  hideHeader = false,
}: BaseAdCanvasNodeProps) {
  const d = data as unknown as AdCanvasFlowNodeData
  const label = title ?? KIND_LABELS[d.kind]

  return (
    <div
      className={[
        'card-text card-elevated rounded-spacing-2 p-spacing-3 map-card-hover border-subtle relative transition-all duration-200',
        wide ? 'w-[300px]' : 'w-[220px]',
        selected ? 'map-card-selected' : '',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="bg-border hover:bg-primary h-3 w-3 transition-colors"
        isConnectable
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="bg-border hover:bg-primary h-3 w-3 transition-colors"
        isConnectable
      />

      {!hideHeader ? (
        <div className="mb-spacing-2 flex items-center justify-between gap-2">
          <span className="badge-glass badge-glass-muted body-4 font-medium">{label}</span>
          <span
            className={['badge-glass body-4 font-medium capitalize', STATUS_CLASS[d.status]].join(
              ' ',
            )}
          >
            {d.status === 'generating' ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="icon-xs animate-spin" />
                {d.status}
              </span>
            ) : (
              d.status
            )}
          </span>
        </div>
      ) : null}

      {sourcePicker ? <div className="mb-spacing-2">{sourcePicker}</div> : null}

      <div className="body-3 text-foreground min-h-[2rem]">{children}</div>

      {actions.length > 0 ? (
        <div className="mt-spacing-2 flex flex-wrap gap-1">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAction?.(action)
              }}
              className="chip-glass-neutral body-4 rounded-spacing-1 px-spacing-2 py-spacing-1 capitalize"
            >
              {action}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
