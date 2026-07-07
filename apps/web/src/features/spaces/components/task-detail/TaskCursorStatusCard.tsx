'use client'

import type { SpaceItem } from '../../types'

function readCursorString(custom: Record<string, unknown>, key: string): string | null {
  const value = custom[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function getCursorStatusLabel(item: SpaceItem, cursorPrUrl: string | null): string {
  if (item.task_execution_status === 'running') return 'Running'
  if (item.task_execution_status === 'failed') return 'Failed'
  if (item.task_execution_status === 'cancelled') return 'Stopped'
  if (cursorPrUrl) return 'PR ready'
  if (item.task_execution_status === 'done') return 'Done'
  return 'Cursor'
}

export function TaskCursorStatusCard({ item }: { item: SpaceItem }) {
  const custom = (item.custom_data ?? {}) as Record<string, unknown>
  const cursorAgentId = readCursorString(custom, 'cursor_agent_id')
  const cursorAgentUrl = readCursorString(custom, 'cursor_agent_url')
  const cursorPrUrl = readCursorString(custom, 'cursor_pr_url')
  const cursorBranch = readCursorString(custom, 'cursor_branch')
  const cursorSummary = readCursorString(custom, 'cursor_summary')
  const cursorError = readCursorString(custom, 'cursor_error')
  const hasCursor =
    cursorAgentId ||
    cursorAgentUrl ||
    cursorPrUrl ||
    cursorBranch ||
    cursorSummary ||
    cursorError

  if (!hasCursor) return null

  const statusLabel = getCursorStatusLabel(item, cursorPrUrl)

  return (
    <div className="mt-spacing-4 space-y-spacing-2 rounded-spacing-2 border border-border bg-secondary p-spacing-3">
      <div className="body-3 text-foreground font-medium">Cursor</div>
      <div className="body-4 text-muted-foreground">Status: {statusLabel}</div>
      {cursorBranch ? (
        <div className="body-4 text-muted-foreground">Branch: {cursorBranch}</div>
      ) : null}
      {cursorSummary ? <div className="body-4 text-muted-foreground">{cursorSummary}</div> : null}
      {cursorError ? <div className="body-4 text-destructive">{cursorError}</div> : null}
      <div className="gap-spacing-3 flex flex-wrap">
        {cursorAgentUrl ? (
          <a
            href={cursorAgentUrl}
            target="_blank"
            rel="noreferrer"
            className="body-3 text-primary hover:underline"
          >
            Open in Cursor
          </a>
        ) : null}
        {cursorPrUrl ? (
          <a
            href={cursorPrUrl}
            target="_blank"
            rel="noreferrer"
            className="body-3 text-primary hover:underline"
          >
            Open PR
          </a>
        ) : null}
      </div>
    </div>
  )
}
