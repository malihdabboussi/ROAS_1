'use client'

import { memo, useCallback, useRef, useState } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { StrategyNodeData } from '../workflow-flow-transform'

function GroupBoxNodeComponent(props: NodeProps) {
  const { data, selected, id } = props
  const d = data as StrategyNodeData
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    const newText = inputRef.current?.value
    if (newText !== undefined && newText !== d.text) {
      window.dispatchEvent(
        new CustomEvent('strategy:update-node', { detail: { nodeId: id, text: newText } }),
      )
    }
  }, [d.text, id])

  return (
    <div
      className={[
        'rounded-spacing-2 relative cursor-pointer transition-all duration-200',
        selected ? 'ring-primary/30 ring-2' : '',
      ].join(' ')}
      style={{
        width: 320,
        height: 200,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'var(--border)',
        background: 'transparent',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <div className="bg-background px-spacing-2 absolute -top-3 left-3">
        {isEditing ? (
          <input
            ref={inputRef}
            defaultValue={d.text}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') {
                e.preventDefault()
                inputRef.current?.blur()
              }
            }}
            className="nodrag body-4 text-muted-foreground border-none bg-transparent p-0 font-medium uppercase tracking-wider outline-none"
            style={{ width: 120 }}
          />
        ) : (
          <span className="body-4 text-muted-foreground/60 font-medium uppercase tracking-wider">
            {d.text || 'Group'}
          </span>
        )}
      </div>
    </div>
  )
}

export const GroupBoxNode = memo(GroupBoxNodeComponent)
