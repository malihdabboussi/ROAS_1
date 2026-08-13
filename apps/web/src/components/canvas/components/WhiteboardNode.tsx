'use client'

import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils/cn'
import type { WhiteboardNode as WhiteboardNodeType } from '../types/whiteboard.types'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export function WhiteboardNode({ id, data, selected }: NodeProps<WhiteboardNodeType>) {
  const isText = data.kind === 'text'
  const isShape = data.kind === 'shape'
  const isFrame = data.kind === 'frame'

  return (
    <div
      className={cn(
        'relative h-full min-h-24 w-full min-w-48 rounded-spacing-3 border p-spacing-3 shadow-sm transition-shadow',
        data.kind === 'note' ? 'badge-glass-yellow' : 'surface-card border-border',
        isText && 'border-transparent bg-transparent shadow-none',
        isShape && 'flex min-h-32 min-w-56 items-center justify-center rounded-full',
        isFrame && 'border-primary bg-transparent shadow-none',
        selected && 'border-primary shadow-md',
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

      {!isText && (
        <input
          className="nodrag input-glass body-2 mb-spacing-1 w-full border-0 bg-transparent p-0 font-medium"
          value={data.title}
          aria-label="Board item title"
          onChange={(event) => data.onContentChange(id, { title: event.target.value })}
        />
      )}
      {data.resource_type ? (
        <span className="badge-glass-blue body-4 mb-spacing-2 inline-flex rounded-spacing-2 px-spacing-2 py-spacing-1 capitalize">
          {data.resource_type.replaceAll('_', ' ')}
        </span>
      ) : null}
      {!isShape && !isFrame && (
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
    </div>
  )
}
