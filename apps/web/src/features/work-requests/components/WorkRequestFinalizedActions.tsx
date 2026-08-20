'use client'

import { WORK_REQUEST_MESSAGES, workRequestMirrorPendingBody } from '../config/messages.config'

export type WorkRequestFinalizedReceiptView = {
  sync_status?: string
  task_url?: string | null
  clickup_url?: string | null
  last_error?: string | null
}

export function workRequestFinalizedBody(receipt: WorkRequestFinalizedReceiptView): string {
  return receipt.sync_status === 'synced'
    ? `${WORK_REQUEST_MESSAGES.finalizedBody} The ClickUp mirror is confirmed.`
    : workRequestMirrorPendingBody(receipt.last_error)
}

export function WorkRequestFinalizedActions({
  receipt,
  retrying = false,
  onRetry,
}: {
  receipt: WorkRequestFinalizedReceiptView
  retrying?: boolean
  onRetry?: () => void
}) {
  const pending = receipt.sync_status !== 'synced'
  if (!receipt.task_url && !receipt.clickup_url && !(pending && onRetry)) return null
  return (
    <div className="gap-spacing-2 flex flex-wrap">
      {receipt.task_url ? (
        <a
          href={receipt.task_url}
          className="button-default button-glass-primary"
          target="_blank"
          rel="noreferrer"
        >
          Open ROAS task
        </a>
      ) : null}
      {receipt.clickup_url ? (
        <a
          href={receipt.clickup_url}
          target="_blank"
          rel="noreferrer"
          className="button-default button-glass-neutral"
        >
          Open ClickUp task
        </a>
      ) : null}
      {pending && onRetry ? (
        <button
          type="button"
          className="button-default button-glass-neutral"
          disabled={retrying}
          onClick={onRetry}
        >
          {retrying ? WORK_REQUEST_MESSAGES.retryingClickUp : WORK_REQUEST_MESSAGES.retryClickUp}
        </button>
      ) : null}
    </div>
  )
}
