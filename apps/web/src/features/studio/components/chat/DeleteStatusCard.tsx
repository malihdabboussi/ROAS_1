'use client'

import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import type { MessageContentBlock } from '../../types'

type DeleteStatusBlock = Extract<MessageContentBlock, { type: 'delete_status' }>

interface DeleteStatusCardProps {
  block: DeleteStatusBlock
}

export function DeleteStatusCard({ block }: DeleteStatusCardProps) {
  const isSuccess = block.status === 'success'
  const isCancelled = block.status === 'cancelled'
  const Icon = isSuccess ? CheckCircle : isCancelled ? XCircle : AlertCircle
  const iconColor = isSuccess
    ? 'text-green-500'
    : isCancelled
      ? 'text-muted-foreground'
      : 'text-destructive'
  const badgeClass = isSuccess
    ? 'badge-glass badge-glass-green'
    : isCancelled
      ? 'badge-glass'
      : 'badge-glass badge-glass-red'
  const label = isSuccess ? 'Deleted' : isCancelled ? 'Cancelled' : 'Failed'

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
      <div className="gap-spacing-3 flex items-center">
        <div className="border-current/20 bg-current/10 flex h-8 w-8 items-center justify-center rounded-full border">
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="gap-spacing-2 flex items-center">
            <h3 className="body-1 text-foreground max-w-[220px] truncate font-medium">
              {block.entity_name}
            </h3>
            <span className={`${badgeClass} typo-caption font-medium`}>{label}</span>
          </div>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            {isSuccess
              ? `${block.entity_type.replace(/_/g, ' ')} deleted successfully.`
              : isCancelled
                ? 'Delete request was cancelled.'
                : block.error || 'Delete request failed.'}
          </p>
        </div>
      </div>
    </div>
  )
}
