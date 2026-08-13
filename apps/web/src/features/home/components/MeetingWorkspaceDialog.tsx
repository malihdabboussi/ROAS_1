'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import { MeetingCallStatusSection } from '@/features/home/components/MeetingCallStatusSection'
import { MeetingRenamableTitle } from '@/features/home/components/MeetingRenamableTitle'
import { MeetingWorkspaceBody } from '@/features/home/components/MeetingWorkspaceBody'
import {
  HOME_TOAST_ERRORS,
  HOME_TOAST_SUCCESS,
} from '@/features/home/config/home-toast-errors.config'
import type { MeetingPostCallAction } from '@/features/home/config/meeting-post-call-actions.config'
import { buildMeetingAwarenessContext } from '@/features/home/lib/build-meeting-awareness-context'
import {
  formatAttendeeSummary,
  formatMeetingWhen,
  meetingPhaseBadgeLabel,
  parseMeetingPrep,
} from '@/features/home/lib/meeting-workspace-display'
import { syncAgendaFathomRecordingToWorkspace } from '@/features/home/lib/sync-agenda-fathom-recording'
import {
  endMeetingCall,
  fetchMeetingWorkspace,
  startMeetingCall,
  toggleMeetingActionStatus,
  type MeetingAction,
  type MeetingSnippet,
  type MeetingWorkspaceBundle,
} from '@/features/home/services/meeting-workspace-api'
import { renameConversation } from '@/lib/conversations/conversations-api'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { updateSpaceItem } from '@/lib/spaces'

export function MeetingWorkspaceDialog({
  spaceId,
  meetingItemId,
  agendaEvent,
  joinUrl,
  meetingStart,
  meetingEnd,
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
  meetingStart?: string | null
  meetingEnd?: string | null
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
  const continueMeetingConversation = useGlobalChatStore(
    (state) => state.continueMeetingConversation,
  )

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
  const meetingEndMs = meetingEnd ? new Date(meetingEnd).getTime() : NaN
  const meetingStartMs = meetingStart ? new Date(meetingStart).getTime() : NaN
  const hasEnded = Number.isFinite(meetingEndMs) && meetingEndMs < Date.now()
  const hasStarted = Number.isFinite(meetingStartMs) && meetingStartMs <= Date.now()
  const isPostCall =
    phase === 'complete' || hasEnded || (hasStarted && (bundle?.recordings.length ?? 0) > 0)
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
  const prepDescription =
    agendaEvent?.description ??
    (bundle?.meeting.source === 'calendar' ? bundle.meeting.description : null)
  const prep = useMemo(() => parseMeetingPrep(prepDescription), [prepDescription])
  const whenLine = formatMeetingWhen(meetingStart, meetingEnd)
  const attendeeSummary = formatAttendeeSummary(agendaEvent?.attendees)

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
    continueMeetingConversation({
      spaceId,
      meetingItemId,
      conversationId,
      awarenessContext,
      timelineVersion: bundle?.snippets.length ?? 0,
    })
    openChatDrawer(conversationId)
  }

  const runPostCallAction = (action: MeetingPostCallAction) => {
    if (!conversationId) return
    focusMeetingChat()
    // The chat panel drops seeds whose work context doesn't match its space
    // scope, so target the meeting's space explicitly.
    useGlobalChatStore.getState().seedComposer({
      content: action.prompt,
      conversationId,
      workContext: { surface: 'spaces', spaceId },
    })
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
    try {
      const updated = await toggleMeetingActionStatus(spaceId, meetingItemId, action)
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

  const handleActionMoved = (action: MeetingAction) => {
    setBundle((current) =>
      current
        ? { ...current, actions: current.actions.filter((row) => row.id !== action.id) }
        : current,
    )
  }

  const handleNoteCreated = (snippet: MeetingSnippet) => {
    setBundle((current) =>
      current ? { ...current, snippets: [...current.snippets, snippet] } : current,
    )
  }

  const handleRename = async (nextTitle: string) => {
    try {
      await updateSpaceItem(spaceId, meetingItemId, { title: nextTitle })
      setBundle((current) =>
        current ? { ...current, meeting: { ...current.meeting, title: nextTitle } } : current,
      )
      // Keep the linked meeting chat in sync so the rename carries everywhere.
      if (conversationId) {
        try {
          await renameConversation(conversationId, nextTitle)
        } catch {
          // Chat title lags behind; the item rename already landed.
        }
      }
      toast.success(HOME_TOAST_SUCCESS.MEETING_RENAMED.userMessage)
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_RENAME_FAILED.userMessage)
    }
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
          <MeetingRenamableTitle title={title} onRename={handleRename} />
          {whenLine || attendeeSummary ? (
            <p className="body-4 text-muted-foreground mt-spacing-1 truncate">
              {whenLine}
              {whenLine && attendeeSummary ? ' · ' : ''}
              {attendeeSummary}
            </p>
          ) : null}
          <p className="sr-only">
            Agenda, recordings, action items, and attachments for this call. Add notes in the
            connected meeting conversation in the main chat.
          </p>
        </div>
        <span className={`badge-glass ${isLive ? 'badge-glass-green' : 'badge-glass-muted'}`}>
          {meetingPhaseBadgeLabel(phase, isPostCall)}
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

      <main className="scrollbar-thin p-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="gap-spacing-4 mx-auto flex w-full max-w-3xl flex-col">
          <MeetingCallStatusSection
            phase={phase}
            isLive={isLive}
            isPostCall={isPostCall}
            hasRecording={Boolean(bundle?.recordings.length)}
            joinUrl={joinUrl}
            starting={starting}
            ending={ending}
            onStart={() => void startCall()}
            onEnd={() => void endCall()}
            onContinue={focusMeetingChat}
            onPostCallAction={runPostCallAction}
          />

          <MeetingWorkspaceBody
            spaceId={spaceId}
            meetingItemId={meetingItemId}
            bundle={bundle}
            loading={loading}
            isLive={isLive}
            isPostCall={isPostCall}
            prep={prep}
            prepDescription={prepDescription}
            joinUrl={joinUrl}
            agendaDocLink={agendaEvent?.prep?.agenda_doc_link ?? null}
            onOpenPrep={onOpenPrep}
            onRecordingLinked={() => {
              void hydrateWorkspace()
            }}
            onNoteCreated={handleNoteCreated}
            onToggleAction={toggleAction}
            onActionCreated={handleActionCreated}
            onActionMoved={handleActionMoved}
          />
        </div>
      </main>
    </section>
  )
}
