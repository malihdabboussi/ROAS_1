import { CalendarDays, CheckCircle2, CircleAlert } from 'lucide-react'

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === 'string' ? row[key] : ''
}

function isClosed(status: string) {
  return ['done', 'complete', 'completed', 'closed', 'cancelled', 'canceled', 'shipped'].includes(
    status.toLowerCase(),
  )
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return 'No date'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AgencyClientWorkRows({
  rows,
  kind,
  updatingId,
  onStatusChange,
}: {
  rows: Array<Record<string, unknown>>
  kind: 'task' | 'request'
  updatingId: string | null
  onStatusChange: (kind: 'task' | 'request', entityId: string, status: string) => Promise<void>
}) {
  if (rows.length === 0) {
    return (
      <p className="body-3 text-muted-foreground py-spacing-5 text-center">No {kind}s to show.</p>
    )
  }
  return (
    <div className="mt-spacing-3 divide-border divide-y">
      {rows.map((row) => {
        const status = text(row, 'status') || text(row, 'clickup_status') || 'Open'
        const closed = isClosed(status)
        const entityId = String(row.id)
        return (
          <div key={entityId} className="gap-spacing-3 py-spacing-3 flex items-start">
            {closed ? (
              <CheckCircle2 className="icon-md text-success mt-spacing-1 shrink-0" />
            ) : (
              <CircleAlert className="icon-md text-muted-foreground mt-spacing-1 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="body-3 text-foreground font-medium">
                {text(row, kind === 'task' ? 'task_description' : 'title') || 'Untitled'}
              </p>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                {[status, text(row, 'assignee_name') || text(row, 'assigned_to_name')]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {row.due_date ? (
              <span className="body-4 text-muted-foreground gap-spacing-1 flex items-center">
                <CalendarDays className="icon-xs" />
                {formatDate(row.due_date)}
              </span>
            ) : null}
            <select
              aria-label={`Update ${kind} status`}
              value={
                closed
                  ? 'completed'
                  : status.toLowerCase() === 'in progress'
                    ? 'in progress'
                    : 'to do'
              }
              disabled={updatingId === entityId}
              onChange={(event) => void onStatusChange(kind, entityId, event.target.value)}
              className="h-spacing-7 body-4 bg-secondary text-foreground rounded-spacing-2 border-border px-spacing-2 focus:ring-primary border outline-none focus:ring-1 disabled:opacity-50"
            >
              <option value="to do">To do</option>
              <option value="in progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )
      })}
    </div>
  )
}
