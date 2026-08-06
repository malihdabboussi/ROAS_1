'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ShellBreadcrumb } from '@/components/shell/ShellBreadcrumb'
import { useShellStore } from '@/components/shell/use-shell-store'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { MeetingWorkspaceDialog } from '@/features/home/components/MeetingWorkspaceDialog'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { resolveMeetingJoinUrl } from '@/features/home/lib/home-meeting-detail'
import { HOME_MEETING_WORK_RESTORE_FEATURE } from '@/features/home/lib/home-meeting-work-restore'
import { resolveMeetingsSpaceId } from '@/features/home/lib/resolve-meetings-space-id'
import {
  resolveScheduledMeeting,
  type ResolvedMeetingWorkspace,
} from '@/features/home/services/meeting-workspace-api'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

export function HomeMeetingDetailHost({
  event,
  onClose,
  onOpenPrep,
}: {
  event: CalendarAgendaEvent
  onClose: () => void
  onOpenPrep: () => void
}) {
  const pathname = usePathname() ?? '/home'
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
    const href = pathname.startsWith('/home') ? pathname : '/home'
    recordWorkAreaPage({
      id: `home-meeting:${event.source}:${event.id}`,
      title: meetingTitle,
      href,
      restore: {
        feature: HOME_MEETING_WORK_RESTORE_FEATURE,
        data: event,
      },
    })
  }, [event, meetingTitle, pathname, recordWorkAreaPage])

  if (target) {
    return (
      <>
        <ShellBreadcrumb>
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="text-muted-foreground truncate">Agenda</span>
            <span className="text-muted-foreground/50 select-none">/</span>
            <span className="text-foreground min-w-0 truncate font-medium">{meetingTitle}</span>
          </div>
        </ShellBreadcrumb>
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
          onOpenPrep={onOpenPrep}
        />
      </>
    )
  }

  return (
    <section
      aria-label="Preparing meeting workspace"
      className="surface-card border-border flex h-full min-h-0 w-full flex-col border"
    >
      <ShellBreadcrumb>
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="text-muted-foreground truncate">Agenda</span>
          <span className="text-muted-foreground/50 select-none">/</span>
          <span className="text-foreground min-w-0 truncate font-medium">{meetingTitle}</span>
        </div>
      </ShellBreadcrumb>
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
      <div className="p-spacing-6 flex min-h-0 flex-1 flex-col items-center justify-center">
        {error ? (
          <>
            <p className="body-2 text-foreground text-center">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="button-default button-glass-neutral mt-spacing-4"
            >
              Close
            </button>
          </>
        ) : (
          <VibeyLoadingOrb text="Getting your meeting space ready..." />
        )}
      </div>
    </section>
  )
}
