import { RefreshCw } from 'lucide-react'
import type { FlowWebhookEndpoint, FlowWebhookEvent } from '@/lib/flows/webhook-endpoints-api'
import { formatWebhookDate } from './flows-webhooks-view.helpers'

export function FlowsWebhookEventsPanel({
  selected,
  events,
  eventsLoading,
  onRefresh,
}: {
  selected: FlowWebhookEndpoint | null
  events: FlowWebhookEvent[]
  eventsLoading: boolean
  onRefresh: () => void
}) {
  return (
    <div className="border-border rounded-spacing-3 p-spacing-4 space-y-spacing-3 border">
      <div className="gap-spacing-2 flex items-center justify-between">
        <h3 className="typo-heading-6 text-foreground">RECENT EVENTS</h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={!selected || eventsLoading}
          className="input-glass h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 gap-spacing-1 inline-flex items-center transition-colors"
        >
          <RefreshCw className="icon-xs" />
          Refresh
        </button>
      </div>
      <div className="space-y-spacing-2">
        {events.length === 0 ? (
          <p className="body-3 text-muted-foreground">
            {selected ? 'No events recorded' : 'Save an endpoint first'}
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="border-border rounded-spacing-2 px-spacing-3 py-spacing-2 border"
            >
              <div className="gap-spacing-2 flex flex-wrap items-center justify-between">
                <span className="body-3 text-foreground">{event.status}</span>
                <span className="body-4 text-muted-foreground">
                  {formatWebhookDate(event.created_at)}
                </span>
              </div>
              <div className="body-4 text-muted-foreground mt-spacing-1">
                {event.matched_automation_ids.length} Flow matches
              </div>
              {event.error_message ? (
                <div className="body-4 text-destructive mt-spacing-1">{event.error_message}</div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
