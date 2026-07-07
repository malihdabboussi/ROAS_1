'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AnimatePresence, motion } from 'framer-motion'
import type { WorkflowFlowNodeData } from '../workflow-flow-transform'

function formatDelay(hours: number): string {
  if (hours < 1) return 'Immediately'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const rem = hours % 24
  if (rem === 0) return `${days}d`
  return `${days}d ${rem}h`
}

function SequenceNodeComponent(props: NodeProps) {
  const { data, selected } = props
  const d = data as WorkflowFlowNodeData
  const emails = d.expanded_emails
  const isExpanded = !!emails && emails.length > 0
  const emailCount = Number(d.meta?.email_count ?? 0)

  return (
    <div
      className={[
        'card-text card-elevated rounded-spacing-2 p-spacing-3 map-card-hover relative w-[200px] cursor-pointer border transition-all duration-200',
        selected ? 'map-card-selected' : '',
        'workflow-node-sequence',
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
        <span className="badge-glass badge-glass-muted body-4 font-medium">Sequence</span>
        {emailCount > 0 && (
          <span className="badge-glass badge-glass-muted body-4 font-medium">
            {emailCount} email{emailCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <h3 className="body-3 text-foreground emphasis-medium text-left leading-tight">{d.label}</h3>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-spacing-2 border-border pt-spacing-2 border-t">
              {emails.map((email, i) => {
                const cumulativeHours = emails
                  .slice(0, i)
                  .reduce((sum, e) => sum + e.delay_hours, 0)
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="flex shrink-0 flex-col items-center">
                      <div className="border-border bg-card text-muted-foreground flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold">
                        {i + 1}
                      </div>
                      {i < emails.length - 1 && (
                        <div className="bg-border min-h-[12px] w-px flex-1" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-1 py-1">
                      <p className="text-foreground truncate text-[11px] leading-tight">
                        {email.subject}
                      </p>
                      <span className="text-muted-foreground/50 shrink-0 text-[10px]">
                        {formatDelay(cumulativeHours)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const SequenceNode = memo(SequenceNodeComponent)
