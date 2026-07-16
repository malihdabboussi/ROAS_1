'use client'

import { memo, useCallback, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Sparkles } from 'lucide-react'
import type { StrategyNodeData } from '../workflow-flow-transform'

const COLOR_MAP: Record<
  string,
  { bg: string; border: string; darkBg: string; darkBorder: string }
> = {
  yellow: {
    bg: 'rgba(250, 204, 21, 0.15)',
    border: 'rgba(250, 204, 21, 0.4)',
    darkBg: 'rgba(250, 204, 21, 0.08)',
    darkBorder: 'rgba(250, 204, 21, 0.25)',
  },
  blue: {
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.4)',
    darkBg: 'rgba(59, 130, 246, 0.08)',
    darkBorder: 'rgba(59, 130, 246, 0.25)',
  },
  green: {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.4)',
    darkBg: 'rgba(34, 197, 94, 0.08)',
    darkBorder: 'rgba(34, 197, 94, 0.25)',
  },
  purple: {
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.4)',
    darkBg: 'rgba(168, 85, 247, 0.08)',
    darkBorder: 'rgba(168, 85, 247, 0.25)',
  },
  pink: {
    bg: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(236, 72, 153, 0.4)',
    darkBg: 'rgba(236, 72, 153, 0.08)',
    darkBorder: 'rgba(236, 72, 153, 0.25)',
  },
  orange: {
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.4)',
    darkBg: 'rgba(249, 115, 22, 0.08)',
    darkBorder: 'rgba(249, 115, 22, 0.25)',
  },
}

function StickyNoteNodeComponent(props: NodeProps) {
  const { data, selected, id } = props
  const d = data as StrategyNodeData
  const [isEditing, setIsEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const colors = (COLOR_MAP[d.color ?? 'yellow'] ?? COLOR_MAP.yellow)!
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const isLinked = !!d.linked_artifact_id

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

  const handleBuild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.dispatchEvent(
        new CustomEvent('strategy:build-node', {
          detail: { nodeId: id, text: d.text, artifactHint: d.artifact_hint },
        }),
      )
    },
    [id, d.text, d.artifact_hint],
  )

  return (
    <div
      className={[
        'rounded-spacing-2 p-spacing-3 relative min-h-[80px] w-[180px] cursor-pointer transition-all duration-200',
        selected ? 'ring-primary/50 ring-2' : '',
      ].join(' ')}
      style={{
        background: isDark ? colors.darkBg : colors.bg,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: isDark ? colors.darkBorder : colors.border,
        opacity: isLinked ? 0.5 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="bg-border hover:bg-primary h-3 w-3 transition-colors"
        isConnectable
      />
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
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="bg-border hover:bg-primary h-3 w-3 transition-colors"
        isConnectable
      />

      <div className="mb-spacing-1 flex items-center justify-between">
        <span className="text-muted-foreground/60 text-[10px] font-medium uppercase tracking-wider">
          Strategy
        </span>
        {d.artifact_hint && (
          <span className="text-muted-foreground/40 text-[10px] capitalize">
            {d.artifact_hint.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {isLinked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-emerald-500">✓</span>
        </div>
      )}

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
          className="nodrag body-3 text-foreground w-full resize-none border-none bg-transparent p-0 outline-none"
          rows={3}
        />
      ) : (
        <p className="body-3 text-foreground whitespace-pre-wrap text-left leading-tight">
          {d.text || 'Double-click to edit...'}
        </p>
      )}

      {isHovered && !isLinked && !isEditing && (
        <button
          type="button"
          onClick={handleBuild}
          className="bg-primary text-primary-foreground absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium shadow-lg"
        >
          <Sparkles className="h-3 w-3" />
          Build with ROAS
        </button>
      )}
    </div>
  )
}

export const StickyNoteNode = memo(StickyNoteNodeComponent)
