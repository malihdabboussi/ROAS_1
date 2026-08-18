'use client'

import { toast } from 'sonner'
import { HOME_AGENDA_MESSAGES } from '@/features/home/config/home-agenda-messages.config'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import {
  fetchMeetingWorkspaceEvent,
  type MeetingRelatedCall,
} from '@/features/home/services/meeting-workspace-api'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

export function MeetingRelatedCallsSection({
  spaceId,
  calls,
  onOpenRelated,
}: {
  spaceId: string
  calls: Array<
    Pick<
      MeetingRelatedCall,
      'meeting_item_id' | 'title' | 'call_date' | 'call_status' | 'recording_url'
    >
  >
  onOpenRelated?: (event: CalendarAgendaEvent) => void
}) {
  if (calls.length === 0) return null

  return (
    <section className="section-card p-spacing-4 gap-spacing-3 flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="body-3 text-foreground font-semibold">
          {HOME_AGENDA_MESSAGES.RELATED_CALLS.message}
        </h2>
        <span className="body-4 text-muted-foreground">{calls.length}</span>
      </div>
      <ul className="gap-spacing-2 flex flex-col">
        {calls.map((call) => (
          <li
            key={call.meeting_item_id}
            className="gap-spacing-2 flex flex-wrap items-center justify-between"
          >
            <div className="min-w-0">
              <p className="body-3 text-foreground truncate">{call.title}</p>
              <p className="body-4 text-muted-foreground">
                {[
                  call.call_date ? new Date(call.call_date).toLocaleDateString() : null,
                  call.call_status,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="gap-spacing-2 flex items-center">
              {call.recording_url ? (
                <a
                  href={call.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="body-4 text-primary"
                >
                  {HOME_AGENDA_MESSAGES.RELATED_CALL_RECORDING.message}
                </a>
              ) : null}
              {onOpenRelated ? (
                <button
                  type="button"
                  className="button-compact button-glass-neutral"
                  onClick={() => {
                    void fetchMeetingWorkspaceEvent(spaceId, call.meeting_item_id)
                      .then((event) => onOpenRelated(event))
                      .catch(() =>
                        toast.error(HOME_TOAST_ERRORS.MEETING_WORKSPACE_LOAD_FAILED.userMessage),
                      )
                  }}
                >
                  {HOME_AGENDA_MESSAGES.RELATED_CALL_OPEN.message}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
