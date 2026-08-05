'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Play, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import { MeetingActionItemsSection } from '@/features/home/components/MeetingActionItemsSection'
import { MeetingRecordingsSection } from '@/features/home/components/MeetingRecordingsSection'
import { MeetingWorkspaceAttachments } from '@/features/home/components/MeetingWorkspaceAttachments'
import { MeetingWorkspaceContextLinks } from '@/features/home/components/MeetingWorkspaceContextLinks'
import {
  HOME_TOAST_ERRORS,
  HOME_TOAST_SUCCESS,
} from '@/features/home/config/home-toast-errors.config'
import { buildMeetingAwarenessContext } from '@/features/home/lib/build-meeting-awareness-context'
import { syncAgendaFathomRecordingToWorkspace } from '@/features/home/lib/sync-agenda-fathom-recording'
import {
  endMeetingCall,
  fetchMeetingWorkspace,
  startMeetingCall,
  updateMeetingActionStatus,
  type MeetingAction,
  type MeetingWorkspaceBundle,
} from '@/features/home/services/meeting-workspace-api'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

function SectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="body-3 text-foreground font-semibold">{children}</h2>
      {typeof count === 'number' ? (
        <span className="badge-glass badge-glass-muted">{count}</span>
      ) : null}
    </div>
  )
}

function phaseBadgeLabel(phase: string | undefined, isPostCall: boolean): string {
  if (phase === 'live') return 'Live'
  if (phase === 'processing') return 'Ended'
  if (isPostCall) return 'Complete'
  return 'Ready'
}

export function MeetingWorkspaceDialog({
  spaceId,
  meetingItemId,
  agendaEvent,
  joinUrl,
  fallbackTitle,
  onBack,
  onClose,
  onOpenPrep,
}: {
  spaceId: string
  meetingItemId: string
  /** Agenda card that opened this workspace — carries the linked Fathom identity. */
  agendaEvent?: CalendarAgendaEvent | null
  joinUrl: string | null
  fallbackTitle: string
  onBack: () => void
  onClose: () => void
  onOpenPrep?: () => void
}) {
  const [bundle, setBundle] = useState<MeetingWorkspaceBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const attachMeetingContext = useGlobalChatStore((state) => state.attachMeetingContext)
  const clearMeetingContext = useGlobalChatStore((state) => state.clearMeetingContext)
  const openChatDrawer = useShellStore((state) => state.openChatDrawer)
  const setWorkAreaOpen = useShellStore((state) => state.setWorkAreaOpen)
  const setRailIntent = useGlobalChatStore((state) => state.setRailIntent)

  const hydrateWorkspace = useCallback(async () => {
    let next = await fetchMeetingWorkspace(spaceId, meetingItemId)
    const phase = next.workspace?.phase
    const missingConversation = !next.workspace?.conversation_id?.trim()
    // startCall ensures the linked conversation; for complete it keeps phase complete.
    // For live it is idempotent. Do not call for scheduled/processing (would force live).
    if (missingConversation && (phase === 'complete' || phase === 'live')) {
      await startMeetingCall(spaceId, meetingItemId)
      next = await fetchMeetingWorkspace(spaceId, meetingItemId)
    }
    // Pull the agenda's already-linked Fathom recording into this workspace.
    if (agendaEvent && next.recordings.length === 0) {
      try {
        const synced = await syncAgendaFathomRecordingToWorkspace({
          spaceId,
          meetingItemId,
          agendaEvent,
          bundle: next,
        })
        if (synced) next = await fetchMeetingWorkspace(spaceId, meetingItemId)
      } catch {
        // Agenda link remains visible; Recordings + is still available if sync fails.
      }
    }
    setBundle(next)
    return next
  }, [agendaEvent, meetingItemId, spaceId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void hydrateWorkspace()
      .catch(() => {
        if (!cancelled) toast.error(HOME_TOAST_ERRORS.MEETING_WORKSPACE_LOAD_FAILED.userMessage)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hydrateWorkspace])

  const title = bundle?.meeting.title?.trim() || fallbackTitle
  const phase = bundle?.workspace?.phase
  const isLive = phase === 'live'
  const isPostCall = phase === 'complete' && (bundle?.recordings.length ?? 0) > 0
  const awarenessContext = useMemo(() => {
    if (!bundle) return ''
    return buildMeetingAwarenessContext({
      spaceId,
      meetingItemId,
      title,
      bundle,
    })
  }, [bundle, meetingItemId, spaceId, title])

  const conversationId = bundle?.workspace?.conversation_id?.trim() || null

  useEffect(() => {
    setWorkAreaOpen(true)
  }, [setWorkAreaOpen])

  useEffect(() => {
    if (!conversationId) return
    // Attach meeting context (switches agent → vibey + spaces scope) before opening the drawer
    // so the panel does not hydrate under a leftover Delegator filter.
    attachMeetingContext({
      spaceId,
      meetingItemId,
      conversationId,
      awarenessContext,
      timelineVersion: bundle?.snippets.length ?? 0,
    })
    // Cancel a stale "new chat" rail intent so hydration cannot wipe the meeting thread.
    setRailIntent(null)
    openChatDrawer(conversationId)
  }, [
    attachMeetingContext,
    awarenessContext,
    bundle?.snippets.length,
    conversationId,
    meetingItemId,
    openChatDrawer,
    setRailIntent,
    spaceId,
  ])

  const handleClose = useCallback(() => {
    clearMeetingContext()
    onClose()
  }, [clearMeetingContext, onClose])

  const handleBack = useCallback(() => {
    clearMeetingContext()
    onBack()
  }, [clearMeetingContext, onBack])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  const focusMeetingChat = () => {
    if (!conversationId) return
    openChatDrawer(conversationId)
  }

  const startCall = async () => {
    setStarting(true)
    try {
      await startMeetingCall(spaceId, meetingItemId)
      await hydrateWorkspace()
      if (joinUrl) window.open(joinUrl, '_blank', 'noopener,noreferrer')
      toast.success(HOME_TOAST_SUCCESS.MEETING_STARTED.userMessage)
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_START_FAILED.userMessage)
    } finally {
      setStarting(false)
    }
  }

  const endCall = async () => {
    setEnding(true)
    try {
      await endMeetingCall(spaceId, meetingItemId)
      await hydrateWorkspace()
      toast.success(HOME_TOAST_SUCCESS.MEETING_ENDED.userMessage)
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_END_FAILED.userMessage)
    } finally {
      setEnding(false)
    }
  }

  const toggleAction = async (action: MeetingAction) => {
    const status = action.status === 'resolved' ? 'confirmed' : 'resolved'
    try {
      const updated = await updateMeetingActionStatus(spaceId, meetingItemId, action.id, status)
      setBundle((current) =>
        current
          ? {
              ...current,
              actions: current.actions.map((row) => (row.id === action.id ? updated : row)),
            }
          : current,
      )
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_ACTION_UPDATE_FAILED.userMessage)
    }
  }

  const handleActionCreated = (action: MeetingAction) => {
    setBundle((current) => {
      if (!current) return current
      if (current.actions.some((row) => row.id === action.id)) return current
      return {
        ...current,
        actions: [...current.actions, action],
      }
    })
  }

  return (
    <section
      aria-label={`${title} meeting workspace`}
      className="border-border bg-background flex h-full min-h-0 w-full flex-col overflow-hidden border"
    >
      <header className="border-border gap-spacing-3 px-spacing-4 py-spacing-3 flex items-center border-b">
        <button type="button" onClick={handleBack} className="button-compact button-glass-neutral">
          Back
        </button>
        <div className="min-w-0 flex-1">
          <p className="typo-caption text-muted-foreground uppercase">Meeting workspace</p>
          <h1 className="title-h6 text-foreground truncate uppercase">{title}</h1>
          <p className="sr-only">
            Agenda, recordings, action items, and attachments for this call. Add notes in the
            connected meeting conversation in the main chat.
          </p>
        </div>
        <MeetingWorkspaceContextLinks spaceId={spaceId} contextLinks={bundle?.context_links} />
        <span className={`badge-glass ${isLive ? 'badge-glass-green' : 'badge-glass-muted'}`}>
          {phaseBadgeLabel(phase, isPostCall)}
        </span>
        <button
          type="button"
          onClick={handleClose}
          className="btn-icon-bare"
          aria-label="Close meeting workspace"
        >
          <X className="icon-xs" />
        </button>
      </header>

      <main className="p-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="gap-spacing-4 mx-auto flex w-full max-w-3xl flex-col">
          <section className="section-card gap-spacing-4 p-spacing-4 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="body-3 text-foreground font-semibold">
                {isLive
                  ? 'Call in progress'
                  : phase === 'processing'
                    ? 'Call ended'
                    : isPostCall
                      ? 'Post-call workspace'
                      : 'Ready when you are'}
              </p>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                {isLive
                  ? 'Dump notes in chat. End the call when you wrap.'
                  : phase === 'processing'
                    ? 'Recording still catching up — keep chatting anytime.'
                    : isPostCall
                      ? 'Continue the same conversation with every recap, note, and transcript.'
                      : 'Start the call without losing your agenda, chat, or follow-ups.'}
              </p>
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
            </div>
            {isLive ? (
              <button
                type="button"
                onClick={endCall}
                disabled={ending}
                className="button-default button-glass-destructive gap-spacing-2 inline-flex shrink-0 items-center disabled:opacity-50"
              >
                <Square className="icon-sm" aria-hidden />
                {ending ? 'Ending…' : 'End call'}
              </button>
            ) : phase === 'processing' || isPostCall ? (
              <button
                type="button"
                onClick={focusMeetingChat}
                className="button-default button-glass-neutral gap-spacing-2 inline-flex shrink-0 items-center"
              >
                Continue in chat
              </button>
            ) : (
              <button
                type="button"
                onClick={startCall}
                disabled={starting}
                className="button-default button-glass-primary gap-spacing-2 inline-flex shrink-0 items-center disabled:opacity-50"
              >
                <Play className="icon-sm" aria-hidden />
                {starting ? 'Opening…' : 'Start call'}
              </button>
            )}
          </section>

          <section className="section-card gap-spacing-2 p-spacing-4 flex flex-col">
            <SectionTitle>Agenda & prep</SectionTitle>
            <p className="body-4 text-muted-foreground whitespace-pre-wrap">
              {bundle?.meeting.description || 'No agenda has been added yet.'}
            </p>
            {onOpenPrep ? (
              <button
                type="button"
                onClick={onOpenPrep}
                className="button-compact button-glass-neutral self-start"
              >
                Open agenda prep
              </button>
            ) : null}
          </section>

          {bundle?.continuity.unresolved_commitments.length ? (
            <section className="section-card rounded-spacing-3 p-spacing-4">
              <SectionTitle count={bundle.continuity.unresolved_commitments.length}>
                Open loops
              </SectionTitle>
              <div className="mt-spacing-3 gap-spacing-2 flex flex-col">
                {bundle.continuity.unresolved_commitments.map((action) => (
                  <p key={action.id} className="body-3 text-foreground">
                    {action.title}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          <MeetingActionItemsSection
            spaceId={spaceId}
            meetingItemId={meetingItemId}
            actions={bundle?.actions ?? []}
            loading={loading}
            onToggle={toggleAction}
            onCreated={handleActionCreated}
          />

          <MeetingWorkspaceAttachments
            spaceId={spaceId}
            deliverables={bundle?.deliverables ?? []}
            loading={loading}
          />

          <MeetingRecordingsSection
            spaceId={spaceId}
            meetingItemId={meetingItemId}
            recordings={bundle?.recordings ?? []}
            onLinked={hydrateWorkspace}
          />
        </div>
      </main>
    </section>
  )
}
