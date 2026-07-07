'use client'

import { memo, useCallback, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Flag } from 'lucide-react'
import type { StrategyNodeData } from '../workflow-flow-transform'

function MilestoneNodeComponent(props: NodeProps) {
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
        'gap-spacing-2 px-spacing-3 py-spacing-2 relative flex cursor-pointer items-center rounded-full transition-all duration-200',
        selected ? 'ring-primary/40 ring-2' : '',
      ].join(' ')}
      style={{
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(168, 85, 247, 0.35)',
        background: 'rgba(168, 85, 247, 0.06)',
      }}
      onDoubleClick={handleDoubleClick}
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

      <Flag className="h-3.5 w-3.5 shrink-0 text-purple-400" />

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
          className="nodrag body-3 text-foreground border-none bg-transparent p-0 font-medium outline-none"
          style={{ width: 120 }}
        />
      ) : (
        <span className="body-3 text-foreground whitespace-nowrap font-medium">
          {d.text || 'Milestone'}
        </span>
      )}
    </div>
  )
}

export const MilestoneNode = memo(MilestoneNodeComponent)
