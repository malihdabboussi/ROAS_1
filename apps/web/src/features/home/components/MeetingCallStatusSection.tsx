'use client'

import { Play, Square } from 'lucide-react'
import { MeetingWorkspaceStatusSelect } from '@/features/home/components/MeetingWorkspaceStatusSelect'
import {
  MEETING_POST_CALL_ACTIONS,
  MEETING_PRE_CALL_ACTIONS,
  type MeetingPostCallAction,
} from '@/features/home/config/meeting-post-call-actions.config'
import type { FieldDef } from '@/lib/spaces/space-schema-types'

function ActionButtons({
  actions,
  onAction,
}: {
  actions: readonly MeetingPostCallAction[]
  onAction: (action: MeetingPostCallAction) => void
}) {
  return actions.map((action) => {
    const Icon = action.icon
    return (
      <button
        key={action.id}
        type="button"
        onClick={() => onAction(action)}
        className="button-compact button-glass-neutral gap-spacing-1 inline-flex items-center"
      >
        <Icon className="icon-xs" aria-hidden />
        {action.label}
      </button>
    )
  })
}

export function MeetingCallStatusSection({
  statusField,
  statusValue,
  hostLabel,
  phase,
  isLive,
  isPostCall,
  hasRecording,
  joinUrl,
  starting,
  ending,
  canContinue,
  onStatusChange,
  onContinue,
  onStart,
  onEnd,
  onPostCallAction,
}: {
  statusField?: FieldDef
  statusValue?: string | null
  hostLabel: string | null
  phase?: string
  isLive: boolean
  isPostCall: boolean
  hasRecording: boolean
  joinUrl: string | null
  starting: boolean
  ending: boolean
  canContinue: boolean
  onStatusChange?: (status: string) => void
  onContinue: () => void
  onStart: () => void
  onEnd: () => void
  onPostCallAction?: (action: MeetingPostCallAction) => void
}) {
  const isProcessing = phase === 'processing'
  const showPostCallActions = (isPostCall || isProcessing) && !isLive && onPostCallAction
  const showPreCallActions = !isLive && !isPostCall && !isProcessing && onPostCallAction
  return (
    <section className="border-border gap-spacing-3 py-spacing-4 flex flex-col border-b">
      <div className="gap-spacing-2 flex w-full flex-wrap items-center">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="button-compact button-glass-neutral disabled:opacity-50"
        >
          Continue in chat
        </button>
        {statusField && onStatusChange ? (
          <MeetingWorkspaceStatusSelect
            field={statusField}
            value={statusValue}
            onChange={onStatusChange}
          />
        ) : null}
        {isLive ? (
          <button
            type="button"
            onClick={onEnd}
            disabled={ending}
            className="button-compact button-glass-destructive gap-spacing-1 inline-flex items-center disabled:opacity-50"
          >
            <Square className="icon-xs" aria-hidden />
            {ending ? 'Ending…' : 'End call'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="button-compact button-glass-primary gap-spacing-1 inline-flex items-center disabled:opacity-50"
          >
            <Play className="icon-xs" aria-hidden />
            {starting ? 'Opening…' : 'Start call'}
          </button>
        )}
        {showPreCallActions ? (
          <ActionButtons actions={MEETING_PRE_CALL_ACTIONS} onAction={onPostCallAction} />
        ) : null}
        {showPostCallActions ? (
          <ActionButtons actions={MEETING_POST_CALL_ACTIONS} onAction={onPostCallAction} />
        ) : null}
      </div>
      {hostLabel ? <p className="body-4 text-muted-foreground">Host: {hostLabel}</p> : null}
      {isLive && joinUrl ? (
        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="typo-caption text-primary inline-flex"
        >
          Open call link
        </a>
      ) : null}
      {hasRecording ? (
        <p className="body-4 text-muted-foreground">Recording is on this call.</p>
      ) : null}
    </section>
  )
}
