'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AlertCircle } from 'lucide-react'
import type { WorkflowFlowNodeData } from '../workflow-flow-transform'

function FunnelNodeComponent(props: NodeProps) {
  const { data, selected } = props
  const d = data as WorkflowFlowNodeData
  const converting = Number(d.converting_pages ?? 0)
  const hasConversion = converting > 0
  const pageCount = Number(d.meta?.page_count ?? 0)
  const status = String(d.meta?.status ?? 'draft')

  return (
    <div
      className={[
        'card-text card-elevated rounded-spacing-2 p-spacing-3 map-card-hover relative w-[200px] cursor-pointer border transition-all duration-200',
        selected ? 'map-card-selected' : '',
        'workflow-node-funnel',
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
        <span className="badge-glass badge-glass-muted body-4 font-medium">Funnel</span>
        <span
          className={[
            'badge-glass body-4 font-medium',
            hasConversion ? 'badge-glass-blue' : 'badge-glass-muted',
          ].join(' ')}
          title={hasConversion ? 'Has converting pages' : 'No converting pages'}
        >
          {converting} converting
        </span>
      </div>

      <h3 className="body-3 text-foreground emphasis-medium mb-spacing-1 text-left leading-tight">
        {d.label}
      </h3>

      <div className="mt-spacing-1 flex items-center gap-2">
        {!hasConversion && <AlertCircle className="text-destructive/80 h-3.5 w-3.5 shrink-0" />}
        {pageCount > 0 && (
          <span className="text-muted-foreground text-[10px]">
            {pageCount} page{pageCount !== 1 ? 's' : ''}
          </span>
        )}
        {status === 'published' && (
          <span className="text-[10px] font-medium text-emerald-500">Published</span>
        )}
      </div>
    </div>
  )
}

export const FunnelNode = memo(FunnelNodeComponent)
