'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { addMissionComment } from '../../services/missions.service'
import type { MissionAgent, MissionLog, MissionSubtask } from '../../types'
import { MISSION_DETAIL_ERRORS } from '../../types'
import {
  formatAgentShortName,
  formatRelativeTime,
  formatSubtaskStatusLabel,
} from './detail-helpers'
import { MissionLockedIn } from './MissionLockedIn'

interface SubtaskDetailModalProps {
  missionId: string
  subtask: MissionSubtask
  agents: MissionAgent[]
  logs: MissionLog[]
  onClose: () => void
  onCommentSent: (log: MissionLog) => void
}

function buildSubtaskScopedMessage(subtask: MissionSubtask, message: string): string {
  return [
    `Guidance for subtask "${subtask.title}" (${subtask.id}):`,
    message.trim(),
  ].join('\n')
}

export function SubtaskDetailModal({
  missionId,
  subtask,
  agents,
  logs,
  onClose,
  onCommentSent,
}: SubtaskDetailModalProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const agent =
    subtask.assigned_agent_key != null
      ? agents.find((item) => item.agent_key === subtask.assigned_agent_key)
      : undefined
  const agentLabel =
    formatAgentShortName(agent?.name ?? subtask.assigned_agent_key ?? '') ||
    agent?.name ||
    subtask.assigned_agent_key ||
    'Unassigned'
  const statusLabel = formatSubtaskStatusLabel(subtask.status)
  const relatedLogs = logs.filter((log) => {
    const payload = (log.payload ?? {}) as Record<string, unknown>
    if (payload.subtask_id === subtask.id) return true
    if (log.event_type === 'user.comment') {
      const message = typeof payload.message === 'string' ? payload.message : ''
      return message.includes(subtask.id) || message.includes(subtask.title)
    }
    return false
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function sendGuidance() {
    const msg = draft.trim()
    if (!msg || sending) return
    setSending(true)
    try {
      const newLog = await addMissionComment(missionId, buildSubtaskScopedMessage(subtask, msg))
      onCommentSent(newLog)
      setDraft('')
      toast.success('Sent to Vibey — they’ll route it for this step.')
    } catch (err) {
      toast.error(sanitizeUserError(err, MISSION_DETAIL_ERRORS.SEND_COMMENT_FAILED.userMessage))
    } finally {
      setSending(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        className="z-modal-layer-4 bg-modal-overlay fixed inset-0"
        onClick={onClose}
        role="presentation"
      />
      <div className="z-modal-layer-4 p-spacing-4 pointer-events-none fixed inset-0 flex items-center justify-center">
        <div
          className="surface-card border-border rounded-spacing-3 pointer-events-auto relative flex max-h-[min(92vh,56rem)] w-full max-w-3xl flex-col overflow-hidden border"
          role="dialog"
          aria-modal="true"
          aria-label={subtask.title}
        >
          <div className="border-border px-spacing-5 py-spacing-4 flex items-start justify-between gap-3 border-b">
            <div className="min-w-0 flex-1">
              <p className="typo-caption text-muted-foreground uppercase tracking-wide">Subtask</p>
              <h2 className="title-h3 text-foreground mt-1 truncate">{subtask.title}</h2>
              <p className="body-3 text-muted-foreground mt-1">
                {statusLabel} · {formatRelativeTime(subtask.updated_at)} · {agentLabel}
              </p>
            </div>
            <button type="button" onClick={onClose} className="btn-icon-bare shrink-0" aria-label="Close">
              <X className="icon-md" />
            </button>
          </div>

          <div className="px-spacing-5 py-spacing-4 min-h-0 flex-1 space-y-4 overflow-y-auto">
            <section className="space-y-2">
              <h3 className="body-2 text-foreground font-semibold">Live run</h3>
              <div className="bg-muted/15 rounded-spacing-2 px-spacing-3 py-spacing-2">
                <MissionLockedIn subtask={subtask} defaultOpen maxHeightClass="max-h-80" />
                {subtask.status !== 'in_progress' &&
                !(
                  Array.isArray(subtask.execution_state?.completed_actions) &&
                  subtask.execution_state.completed_actions.length > 0
                ) ? (
                  <p className="body-3 text-muted-foreground py-2">
                    No live tool stream for this step yet.
                  </p>
                ) : null}
              </div>
            </section>

            {subtask.intent?.why ? (
              <section className="space-y-2">
                <h3 className="body-2 text-foreground font-semibold">Plan intent</h3>
                <div className="space-y-1.5 pl-1">
                  {(
                    [
                      ['Why', subtask.intent.why],
                      ['Story', subtask.intent.story],
                      ['Sensory', subtask.intent.sensory],
                      ['End-State', subtask.intent.endState],
                      ['Ecology', subtask.intent.ecology],
                    ] as const
                  ).map(([label, value]) =>
                    value ? (
                      <div key={label} className="flex gap-2">
                        <span className="body-3 text-muted-foreground shrink-0 font-medium">
                          {label}:
                        </span>
                        <span className="body-3 text-muted-foreground/80">{value}</span>
                      </div>
                    ) : null,
                  )}
                </div>
              </section>
            ) : null}

            {subtask.feedback ? (
              <section className="space-y-2">
                <h3 className="body-2 text-warning font-semibold">Issue</h3>
                <p className="body-3 bg-warning/10 text-warning rounded-spacing-2 px-spacing-3 py-spacing-2">
                  {subtask.feedback}
                </p>
              </section>
            ) : null}

            {subtask.output && Object.keys(subtask.output).length > 0 ? (
              <section className="space-y-2">
                <h3 className="body-2 text-foreground font-semibold">Agent output</h3>
                <div className="bg-muted/15 rounded-spacing-2 px-spacing-3 py-spacing-2">
                  {typeof subtask.output.content === 'string' ? (
                    <MarkdownRenderer className="body-3 text-muted-foreground max-w-none leading-relaxed">
                      {subtask.output.content}
                    </MarkdownRenderer>
                  ) : (
                    <pre className="body-3 text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(subtask.output, null, 2)}
                    </pre>
                  )}
                </div>
              </section>
            ) : null}

            {relatedLogs.length > 0 ? (
              <section className="space-y-2">
                <h3 className="body-2 text-foreground font-semibold">Activity on this step</h3>
                <div className="space-y-2">
                  {relatedLogs.slice(0, 12).map((log) => {
                    const payload = (log.payload ?? {}) as Record<string, unknown>
                    const text =
                      (typeof payload.message === 'string' && payload.message) ||
                      (typeof payload.note === 'string' && payload.note) ||
                      (typeof payload.error === 'string' && payload.error) ||
                      log.event_type
                    return (
                      <div
                        key={log.id}
                        className="border-border rounded-spacing-2 border px-spacing-3 py-spacing-2"
                      >
                        <p className="typo-caption text-muted-foreground">
                          {formatRelativeTime(log.created_at)} · {log.event_type}
                        </p>
                        <p className="body-3 text-foreground mt-1 whitespace-pre-wrap break-words">
                          {text}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <div className="border-border px-spacing-5 py-spacing-4 border-t">
            <p className="body-3 text-muted-foreground mb-2">
              Message Vibey about this step — same mission routing as Activity, scoped to this
              subtask.
            </p>
            <div className="input-glass flex flex-col rounded-xl">
              <div className="px-3 pt-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendGuidance()
                    }
                  }}
                  placeholder="Tell Vibey what to change on this step..."
                  rows={2}
                  className="body-3 text-foreground placeholder:text-muted-foreground max-h-40 min-h-[48px] w-full resize-none bg-transparent focus:outline-none"
                />
              </div>
              <div className="flex justify-end px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => void sendGuidance()}
                  disabled={!draft.trim() || sending}
                  className="button-glass-neutral flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-30"
                  aria-label="Send to Vibey"
                >
                  <Send className={`h-3.5 w-3.5 ${sending ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
