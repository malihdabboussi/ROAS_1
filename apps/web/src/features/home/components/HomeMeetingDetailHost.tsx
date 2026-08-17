'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ShellBreadcrumb } from '@/components/shell/ShellBreadcrumb'
import { useShellStore } from '@/components/shell/use-shell-store'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { MeetingWorkspaceDialog } from '@/features/home/components/MeetingWorkspaceDialog'
import { HOME_AGENDA_MESSAGES } from '@/features/home/config/home-agenda-messages.config'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { resolveMeetingJoinUrl } from '@/features/home/lib/home-meeting-detail'
import {
  HOME_MEETING_WORK_RESTORE_FEATURE,
  homeMeetingHref,
} from '@/features/home/lib/home-meeting-work-restore'
import { resolveMeetingsSpaceId } from '@/features/home/lib/resolve-meetings-space-id'
import {
  resolveScheduledMeeting,
  type ResolvedMeetingWorkspace,
} from '@/features/home/services/meeting-workspace-api'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

function MeetingWorkspaceBreadcrumb({
  title,
  onAgendaClick,
}: {
  title: string
  onAgendaClick: () => void
}) {
  return (
    <ShellBreadcrumb label={title}>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <button
          type="button"
          onClick={onAgendaClick}
          className="text-muted-foreground hover:text-foreground truncate"
        >
          Agenda
        </button>
        <span className="text-muted-foreground/50 select-none">/</span>
        <span className="text-foreground min-w-0 truncate font-medium">{title}</span>
      </nav>
    </ShellBreadcrumb>
  )
}

export function HomeMeetingDetailHost({
  event,
  onClose,
}: {
  event: CalendarAgendaEvent
  onClose: () => void
}) {
  const recordWorkAreaPage = useShellStore((state) => state.recordWorkAreaPage)
  const related = event.related
  const [target, setTarget] = useState<ResolvedMeetingWorkspace | null>(() =>
    related?.space_id && related.call_item_id
      ? {
          space_id: related.space_id,
          meeting_item_id: related.call_item_id,
          conversation_id: '',
        }
      : null,
  )
  const [error, setError] = useState<string | null>(null)
  const meetingTitle = event.title.trim() || 'Meeting'

  useEffect(() => {
    if (related?.space_id && related.call_item_id) {
      setTarget({
        space_id: related.space_id,
        meeting_item_id: related.call_item_id,
        conversation_id: '',
      })
      setError(null)
      return
    }
    let cancelled = false
    setTarget(null)
    setError(null)
    void resolveMeetingsSpaceId()
      .then(async (spaceId) => {
        if (!spaceId) throw new Error(HOME_TOAST_ERRORS.MEETINGS_SPACE_REQUIRED.userMessage)
        return resolveScheduledMeeting(spaceId, event)
      })
      .then((resolved) => {
        if (!cancelled) setTarget(resolved)
      })
      .catch((reason) => {
        if (cancelled) return
        setError(
          sanitizeUserError(reason, HOME_TOAST_ERRORS.MEETING_WORKSPACE_LOAD_FAILED.userMessage),
        )
      })
    return () => {
      cancelled = true
    }
  }, [event, related?.call_item_id, related?.space_id])

  useEffect(() => {
    // The href carries the meeting identity so a remembered surface reopens
    // this exact meeting on the meetings route, never the broad screen. The id
    // matches what the top bar records for the same URL so the entries merge.
    const href = homeMeetingHref(event, event.related?.space_id)
    recordWorkAreaPage({
      id: href,
      title: meetingTitle,
      href,
      restore: {
        feature: HOME_MEETING_WORK_RESTORE_FEATURE,
        data: event,
      },
    })
  }, [event, meetingTitle, recordWorkAreaPage])

  if (target) {
    return (
      <>
        <MeetingWorkspaceBreadcrumb title={meetingTitle} onAgendaClick={onClose} />
        <MeetingWorkspaceDialog
          spaceId={target.space_id}
          meetingItemId={target.meeting_item_id}
          agendaEvent={event}
          joinUrl={resolveMeetingJoinUrl(event)}
          meetingStart={event.start}
          meetingEnd={event.end}
          fallbackTitle={event.title}
          onBack={onClose}
          onClose={onClose}
        />
      </>
    )
  }

  return (
    <section
      aria-label="Preparing meeting workspace"
      className="surface-card border-border flex h-full min-h-0 w-full flex-col border"
    >
      <MeetingWorkspaceBreadcrumb title={meetingTitle} onAgendaClick={onClose} />
      <p className="sr-only">
        Creating or reconnecting the workspace and persistent chat for this meeting.
      </p>
      <div className="p-spacing-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="btn-icon-bare"
          aria-label="Close meeting workspace"
        >
          <X className="icon-xs" />
        </button>
      </div>
      {error ? (
        <div className="p-spacing-6 flex min-h-0 flex-1 flex-col items-center justify-center">
          <p className="body-2 text-foreground text-center">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="button-default button-glass-neutral mt-spacing-4"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="px-spacing-4 py-spacing-3 min-h-0 flex-1 overflow-hidden">
          <ListSkeleton rows={6} label={HOME_AGENDA_MESSAGES.LOADING_MEETING_WORKSPACE.message} />
        </div>
      )}
    </section>
  )
}
