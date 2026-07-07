'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { backendPost } from '@/lib/api/backend-client'
import type { MessageContentBlock } from '../../types'

type DeleteConfirmBlock = Extract<MessageContentBlock, { type: 'delete_confirm' }>

interface DeleteConfirmCardProps {
  block: DeleteConfirmBlock
  agentMessageId?: string
  onResolved?: (payload: {
    status: 'success' | 'failed' | 'cancelled'
    entity_type: string
    entity_id: string
    entity_name: string
    error?: string
  }) => void
}

export function DeleteConfirmCard({ block, agentMessageId, onResolved }: DeleteConfirmCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await backendPost<{
        success: boolean
        error?: string
      }>('/api/artifacts/delete', {
        delete_action: block.delete_action,
        entity_id: block.entity_id,
        ...(agentMessageId ? { agent_message_id: agentMessageId } : {}),
      })
      if (!response?.success) throw new Error(response?.error || 'Delete failed')
      onResolved?.({
        status: 'success',
        entity_type: block.entity_type,
        entity_id: block.entity_id,
        entity_name: block.entity_name,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setError(message)
      onResolved?.({
        status: 'failed',
        entity_type: block.entity_type,
        entity_id: block.entity_id,
        entity_name: block.entity_name,
        error: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
      <div className="gap-spacing-2 flex items-center">
        <AlertTriangle className="icon-sm text-orange-500" />
        <h3 className="body-1 text-foreground font-medium">Confirm Delete</h3>
      </div>
      <p className="body-3 text-muted-foreground mt-spacing-2">
        Delete{' '}
        <span className="text-foreground inline-block max-w-[280px] truncate align-bottom font-medium">
          {block.entity_name}
        </span>
        ? This action cannot be undone.
      </p>

      {error && <p className="body-3 text-destructive mt-spacing-2">{error}</p>}

      <div className="mt-spacing-3 gap-spacing-2 flex">
        <button
          type="button"
          onClick={() =>
            onResolved?.({
              status: 'cancelled',
              entity_type: block.entity_type,
              entity_id: block.entity_id,
              entity_name: block.entity_name,
            })
          }
          disabled={loading}
          className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 inline-flex items-center gap-1.5 font-medium disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="button-glass-red rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 inline-flex items-center gap-1.5 font-medium disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          {loading ? 'Deleting...' : 'Approve Delete'}
        </button>
      </div>
    </div>
  )
}
