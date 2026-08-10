'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { MeetingWorkspaceDialog } from '@/features/home/components/MeetingWorkspaceDialog'
import { HOME_AGENDA_MESSAGES } from '@/features/home/config/home-agenda-messages.config'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { resolveMeetingsSpaceId } from '@/features/home/lib/resolve-meetings-space-id'
import {
  createInstantMeeting,
  type ResolvedMeetingWorkspace,
} from '@/features/home/services/meeting-workspace-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

const DEFAULT_TITLE = 'Impromptu call'

function parseAttendeeEmails(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
}

export function HomeInstantMeetingHost({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState(DEFAULT_TITLE)
  const [attendees, setAttendees] = useState('')
  const [creating, setCreating] = useState(false)
  const [target, setTarget] = useState<ResolvedMeetingWorkspace | null>(null)

  const close = () => {
    setTarget(null)
    setTitle(DEFAULT_TITLE)
    setAttendees('')
    onOpenChange(false)
  }

  const createWorkspace = async () => {
    const meetingTitle = title.trim()
    if (!meetingTitle) return
    setCreating(true)
    try {
      const spaceId = await resolveMeetingsSpaceId()
      if (!spaceId) throw new Error(HOME_TOAST_ERRORS.MEETINGS_SPACE_REQUIRED.userMessage)
      const created = await createInstantMeeting(spaceId, {
        title: meetingTitle,
        attendeeEmails: parseAttendeeEmails(attendees),
      })
      setTarget(created)
      onCreated()
    } catch (error) {
      toast.error(
        sanitizeUserError(error, HOME_TOAST_ERRORS.INSTANT_MEETING_CREATE_FAILED.userMessage),
      )
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  if (target) {
    return (
      <MeetingWorkspaceDialog
        spaceId={target.space_id}
        meetingItemId={target.meeting_item_id}
        joinUrl={null}
        fallbackTitle={title.trim() || DEFAULT_TITLE}
        onBack={close}
        onClose={close}
      />
    )
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(next) => !next && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-content p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 gap-spacing-4 bg-card flex w-full max-w-lg flex-col border shadow-2xl">
            <div className="gap-spacing-3 flex items-start">
              <span className="badge-glass badge-glass-purple p-spacing-2 shrink-0">
                <Video className="icon-sm" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="title-h6 text-foreground">
                  {HOME_AGENDA_MESSAGES.INSTANT_MEETING_TITLE.message}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                  {HOME_AGENDA_MESSAGES.INSTANT_MEETING_DESCRIPTION.message}
                </DialogPrimitive.Description>
              </div>
              <button type="button" onClick={close} className="btn-icon-bare" aria-label="Close">
                <X className="icon-xs" />
              </button>
            </div>

            <div className="gap-spacing-2 flex flex-col">
              <label htmlFor="instant-meeting-title" className="body-3 text-foreground font-medium">
                {HOME_AGENDA_MESSAGES.INSTANT_MEETING_NAME_LABEL.message}
              </label>
              <input
                id="instant-meeting-title"
                className="input-glass"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                autoFocus
              />
            </div>

            <div className="gap-spacing-2 flex flex-col">
              <label
                htmlFor="instant-meeting-attendees"
                className="body-3 text-foreground font-medium"
              >
                {HOME_AGENDA_MESSAGES.INSTANT_MEETING_ATTENDEES_LABEL.message}
              </label>
              <input
                id="instant-meeting-attendees"
                className="input-glass"
                value={attendees}
                onChange={(event) => setAttendees(event.target.value)}
                placeholder="client@example.com, teammate@example.com"
                aria-describedby="instant-meeting-attendees-help"
              />
              <span id="instant-meeting-attendees-help" className="body-4 text-muted-foreground">
                {HOME_AGENDA_MESSAGES.INSTANT_MEETING_ATTENDEES_HELP.message}
              </span>
            </div>

            <div className="gap-spacing-2 flex justify-end">
              <button type="button" onClick={close} className="button-default button-glass-neutral">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createWorkspace()}
                disabled={creating || !title.trim()}
                className="button-default button-glass-primary disabled:opacity-50"
              >
                {creating ? 'Starting…' : HOME_AGENDA_MESSAGES.INSTANT_MEETING_START.message}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
