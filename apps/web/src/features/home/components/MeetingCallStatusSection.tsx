'use client'

import {
  MEETING_POST_CALL_ACTIONS,
  MEETING_PRE_CALL_ACTIONS,
  type MeetingPostCallAction,
} from '@/features/home/config/meeting-post-call-actions.config'

const STATUS_OPTIONS: Array<{
  id: '' | 'live' | 'completed' | 'no_show' | 'rescheduled'
  label: string
}> = [
  { id: '', label: 'Status' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Completed' },
  { id: 'no_show', label: 'No Show' },
  { id: 'rescheduled', label: 'Rescheduled' },
]

export function MeetingCallStatusSection({
  callStatus,
  hostLabel,
  isLive,
  isPostCall,
  hasRecording,
  joinUrl,
  saving,
  onCallStatusChange,
  onPostCallAction,
}: {
  callStatus: string | null
  hostLabel: string | null
  isLive: boolean
  isPostCall: boolean
  hasRecording: boolean
  joinUrl: string | null
  saving: boolean
  onCallStatusChange: (status: string | null) => void
  onPostCallAction?: (action: MeetingPostCallAction) => void
}) {
  const showPostCallActions =
    (isPostCall || callStatus === 'completed') && !isLive && onPostCallAction
  const showPreCallActions =
    !isLive && !isPostCall && callStatus !== 'completed' && onPostCallAction
  return (
    <section className="border-border gap-spacing-4 py-spacing-4 flex flex-col border-b">
      <div className="gap-spacing-3 flex flex-wrap items-center justify-between">
        <div className="min-w-0 flex-1">
          <label className="body-4 text-muted-foreground" htmlFor="meeting-call-status">
            Call status
          </label>
          <div className="gap-spacing-2 mt-spacing-1 flex flex-wrap items-center">
            <select
              id="meeting-call-status"
              value={callStatus ?? ''}
              disabled={saving}
              onChange={(event) => onCallStatusChange(event.target.value || null)}
              className="border-border bg-background text-foreground body-3 px-spacing-2 py-spacing-1 rounded-md border"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.id || 'blank'} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {hostLabel ? <p className="body-4 text-muted-foreground">Host: {hostLabel}</p> : null}
          </div>
          {isLive && joinUrl ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="typo-caption text-primary mt-spacing-2 inline-flex"
            >
              Open call link
            </a>
          ) : null}
          {hasRecording ? (
            <p className="body-4 text-muted-foreground mt-spacing-1">Recording is on this call.</p>
          ) : null}
        </div>
      </div>
      {showPreCallActions ? (
        <div className="gap-spacing-2 flex w-full flex-wrap items-center">
          {MEETING_PRE_CALL_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onPostCallAction(action)}
                className="button-compact button-glass-neutral gap-spacing-1 inline-flex items-center"
              >
                <Icon className="icon-xs" aria-hidden />
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}
      {showPostCallActions ? (
        <div className="gap-spacing-2 flex w-full flex-wrap items-center">
          {MEETING_POST_CALL_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onPostCallAction(action)}
                className="button-compact button-glass-neutral gap-spacing-1 inline-flex items-center"
              >
                <Icon className="icon-xs" aria-hidden />
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
