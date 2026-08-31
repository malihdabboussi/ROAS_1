'use client'

import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils/cn'
import type { WhiteboardNode as WhiteboardNodeType } from '../types/whiteboard.types'
import { CanvasPlaceholderActions } from './CanvasPlaceholderActions'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]
const VISUAL_ROLE_CLASS = {
  live: 'canvas-card-live',
  complete: 'canvas-card-complete',
  dead_end: 'canvas-card-dead-end',
  changed: 'canvas-card-changed',
  to_build: 'canvas-card-to-build',
  band: 'canvas-card-band',
  frame: 'canvas-frame-spec',
  heading: 'canvas-heading-spec',
} as const

export function WhiteboardNode({ id, data, selected }: NodeProps<WhiteboardNodeType>) {
  const isText = data.kind === 'text'
  const isShape = data.kind === 'shape'
  const isFrame = data.kind === 'frame'
  const isPlaceholder = data.semantic_type === 'asset_placeholder'
  const isExternalUrl = data.semantic_type === 'external_url' && Boolean(data.source?.url)

  return (
    <div
      className={cn(
        'rounded-spacing-3 p-spacing-3 relative h-full min-h-24 w-full min-w-48 border shadow-sm transition-shadow',
        data.kind === 'note' ? 'badge-glass-yellow' : 'surface-card border-border',
        isText && 'border-transparent bg-transparent shadow-none',
        isShape && 'flex min-h-32 min-w-56 items-center justify-center rounded-full',
        isFrame && 'border-primary bg-transparent shadow-none',
        selected && 'border-primary shadow-md',
        isPlaceholder && 'border-primary',
        data.visual_role && VISUAL_ROLE_CLASS[data.visual_role],
      )}
    >
      <NodeResizer
        isVisible={selected && !data.locked}
        minWidth={160}
        minHeight={80}
        onResizeEnd={(_, params) => data.onSizeChange(id, params.width, params.height)}
      />
      {HANDLE_POSITIONS.map((position) => (
        <Handle
          key={position}
          type={position === Position.Left || position === Position.Top ? 'target' : 'source'}
          position={position}
          className="border-background bg-primary"
        />
      ))}

      {(!isText || isFrame) && (
        <input
          className={cn(
            'nodrag input-glass body-2 mb-spacing-1 w-full border-0 bg-transparent p-0 font-medium',
            isFrame && 'canvas-frame-title-spec',
          )}
          value={data.title}
          aria-label="Board item title"
          onChange={(event) => data.onContentChange(id, { title: event.target.value })}
        />
      )}
      {data.resource_type ? (
        <span className="badge-glass-blue body-4 mb-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 inline-flex capitalize">
          {data.resource_type.replaceAll('_', ' ')}
        </span>
      ) : null}
      {isExternalUrl ? (
        <div className="nodrag border-border mb-spacing-2 rounded-spacing-2 bg-background overflow-hidden border">
          <div className="border-border gap-spacing-1 px-spacing-2 py-spacing-1 flex items-center border-b">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <a
              className="body-4 text-primary ml-spacing-1 min-w-0 flex-1 truncate underline"
              href={data.source!.url}
              target="_blank"
              rel="noreferrer"
            >
              {data.source!.label || data.source!.url}
            </a>
          </div>
          <iframe
            className="nowheel pointer-events-none h-36 w-full bg-white"
            src={data.source!.url}
            title={`Preview of ${data.title}`}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : null}
      {!isShape && !isFrame && !isExternalUrl && (
        <textarea
          className={cn(
            'nodrag nowheel input-glass w-full resize-none border-0 bg-transparent p-0',
            isText ? 'body-1 min-h-12 min-w-48' : 'body-3 min-h-20',
          )}
          value={data.text}
          aria-label="Board item content"
          onChange={(event) => data.onContentChange(id, { text: event.target.value })}
        />
      )}
      {data.metric ? <p className="canvas-metric-spec">{data.metric}</p> : null}
      {isPlaceholder ? (
        <CanvasPlaceholderActions
          nodeId={id}
          disabled={data.status === 'creating'}
          onAction={data.onPlaceholderAction}
        />
      ) : null}
    </div>
  )
}
