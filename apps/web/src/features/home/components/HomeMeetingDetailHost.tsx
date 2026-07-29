'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { MeetingWorkspaceDialog } from '@/features/home/components/MeetingWorkspaceDialog'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { resolveMeetingJoinUrl } from '@/features/home/lib/home-meeting-detail'
import { resolveMeetingsSpaceId } from '@/features/home/lib/resolve-meetings-space-id'
import {
  resolveScheduledMeeting,
  type ResolvedMeetingWorkspace,
} from '@/features/home/services/meeting-workspace-api'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

export function HomeMeetingDetailHost({
  event,
  onClose,
  onOpenPrep,
}: {
  event: CalendarAgendaEvent
  onClose: () => void
  onOpenPrep: () => void
}) {
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
          reason instanceof Error
            ? reason.message
            : HOME_TOAST_ERRORS.MEETING_WORKSPACE_LOAD_FAILED.userMessage,
        )
      })
    return () => {
      cancelled = true
    }
  }, [event, related?.call_item_id, related?.space_id])

  if (target) {
    return (
      <MeetingWorkspaceDialog
        spaceId={target.space_id}
        meetingItemId={target.meeting_item_id}
        joinUrl={resolveMeetingJoinUrl(event)}
        fallbackTitle={event.title}
        onBack={onClose}
        onClose={onClose}
        onOpenPrep={onOpenPrep}
      />
    )
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 bg-card flex w-full max-w-md flex-col items-center border shadow-2xl">
            <DialogPrimitive.Title className="sr-only">
              Preparing meeting workspace
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Creating or reconnecting the workspace and persistent chat for this meeting.
            </DialogPrimitive.Description>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon-bare self-end"
              aria-label="Close meeting workspace"
            >
              <X className="icon-xs" />
            </button>
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
