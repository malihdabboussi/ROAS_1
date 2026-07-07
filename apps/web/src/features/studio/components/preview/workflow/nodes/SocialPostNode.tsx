'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { WorkflowFlowNodeData } from '../workflow-flow-transform'

function SocialPostNodeComponent(props: NodeProps) {
  const { data, selected } = props
  const d = data as WorkflowFlowNodeData
  const platform = d.meta?.platform as string | undefined

  return (
    <div
      className={[
        'card-text card-elevated rounded-spacing-2 p-spacing-3 map-card-hover relative w-[200px] cursor-pointer border transition-all duration-200',
        selected ? 'map-card-selected' : '',
        'workflow-node-social_post',
      ].join(' ')}
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

      <div className="mb-spacing-2 flex items-center justify-between">
        <span className="badge-glass badge-glass-muted body-4 font-medium">Social Post</span>
        {platform && (
          <span className="badge-glass badge-glass-muted body-4 font-medium capitalize">
            {platform}
          </span>
        )}
      </div>

      <h3 className="body-3 text-foreground emphasis-medium line-clamp-2 text-left leading-tight">
        {d.label}
      </h3>
    </div>
  )
}

export const SocialPostNode = memo(SocialPostNodeComponent)
