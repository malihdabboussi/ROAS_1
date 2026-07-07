'use client'

import { memo, useCallback, useRef, useState } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { StrategyNodeData } from '../workflow-flow-transform'

function TextBlockNodeComponent(props: NodeProps) {
  const { data, selected, id } = props
  const d = data as StrategyNodeData
  const [isEditing, setIsEditing] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
    setTimeout(() => textRef.current?.focus(), 0)
  }, [])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    const newText = textRef.current?.value
    if (newText !== undefined && newText !== d.text) {
      window.dispatchEvent(
        new CustomEvent('strategy:update-node', { detail: { nodeId: id, text: newText } }),
      )
    }
  }, [d.text, id])

  return (
    <div
      className={[
        'rounded-spacing-1 p-spacing-2 relative min-w-[160px] max-w-[280px] cursor-pointer transition-all duration-200',
        selected ? 'ring-primary/30 ring-2' : '',
      ].join(' ')}
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'var(--border)',
        opacity: 0.85,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textRef}
          defaultValue={d.text}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
              e.preventDefault()
              textRef.current?.blur()
            }
          }}
          className="nodrag body-4 text-muted-foreground w-full resize-none border-none bg-transparent p-0 outline-none"
          rows={2}
        />
      ) : (
        <p className="body-4 text-muted-foreground whitespace-pre-wrap text-left italic leading-tight">
          {d.text || 'Double-click to add notes...'}
        </p>
      )}
    </div>
  )
}

export const TextBlockNode = memo(TextBlockNodeComponent)
