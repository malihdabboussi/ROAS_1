'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import {
  notificationMarkdownSource,
  notificationRetryJobId,
} from '@/lib/notifications/notification-meta'
import { retryBrainImportJobFromNotification } from '../services/missions.service'
import type { AwarenessPoint, UserNotification } from '../types'

const LABELS: Record<string, string> = {
  mission_blocked: 'Blocked',
  mission_completed: 'Completed',
  mission_failed: 'Failed',
  deliverable_ready: 'Deliverable',
  subtask_blocked: 'Subtask Blocked',
  plan_approval_required: 'Plan approval',
  org_invitation: 'Org Invite',
  brain_import_succeeded: 'Brain Complete',
  brain_import_failed: 'Brain Failed',
  awareness_paused: 'Credits',
}

const DOT_CLASS: Record<string, string> = {
  mission_blocked: 'indicator-dot-glass-orange',
  mission_completed: 'indicator-dot-glass-green',
  mission_failed: 'indicator-dot-glass-red',
  deliverable_ready: 'indicator-dot-glass-blue',
  subtask_blocked: 'indicator-dot-glass-orange',
  plan_approval_required: 'indicator-dot-glass-blue',
  org_invitation: 'indicator-dot-glass-green',
  brain_import_succeeded: 'indicator-dot-glass-green',
  brain_import_failed: 'indicator-dot-glass-red',
  awareness_paused: 'indicator-dot-glass-red',
}

export type NotificationsFeedItem =
  | { kind: 'notification'; data: UserNotification }
  | { kind: 'awareness'; data: AwarenessPoint }

function formatFeedWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

interface NotificationsFeedModalProps {
  open: boolean
  onClose: () => void
  items: NotificationsFeedItem[]
  onNotificationClick: (n: UserNotification) => void
}

export function NotificationsFeedModal({
  open,
  onClose,
  items,
  onNotificationClick,
}: NotificationsFeedModalProps) {
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null)

  if (!open) return null

  return (
    <>
      <div className="z-modal-backdrop fixed inset-0" onClick={onClose} aria-hidden />
      <div className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden p-2">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notifications-feed-title"
          className="surface-card card-elevated wizard-container-border rounded-spacing-4 container-modal-lg pointer-events-auto relative flex max-h-[min(85vh,56rem)] w-full flex-col overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-icon-bare btn-close-absolute"
            aria-label="Close"
          >
            <X className="icon-sm" />
          </button>

          <div className="relative z-20 shrink-0">
            <div className="border-border px-spacing-4 pb-spacing-2 pr-spacing-12 pt-spacing-4 sm:px-spacing-6 sm:pr-spacing-14 sm:pt-spacing-4 border-b">
              <h2
                id="notifications-feed-title"
                className="title-h6 text-foreground font-semibold uppercase tracking-wide"
              >
                All notifications
              </h2>
            </div>
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-[var(--color-card)] to-transparent"
              aria-hidden
            />
          </div>

          <div className="scrollbar-thin px-spacing-4 py-spacing-4 sm:px-spacing-6 sm:py-spacing-6 relative z-0 min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="body-3 text-muted-foreground py-spacing-6 text-center">
                No notifications yet.
              </p>
            ) : (
              <div className="relative">
                <div className="bg-border absolute bottom-0 left-[7px] top-2 w-px" aria-hidden />
                <ul className="relative space-y-0">
                  {items.map((item) => {
                    if (item.kind === 'notification') {
                      const n = item.data
                      const label = LABELS[n.type] || n.type
                      const dot = DOT_CLASS[n.type] || 'indicator-dot-glass-muted'
                      const retryJobId = notificationRetryJobId(n)
                      return (
                        <li key={`n-${n.id}`} className="pb-spacing-6 relative last:pb-0">
                          <div className="gap-spacing-3 flex">
                            <div className="relative flex h-6 w-4 shrink-0 flex-col items-center">
                              <span
                                className={`relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[var(--color-card)] ${dot}`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="gap-spacing-2 mb-2 flex flex-wrap items-baseline justify-between gap-y-1">
                                <span className="typo-caption text-muted-foreground font-medium">
                                  {label}
                                </span>
                                <time
                                  className="typo-caption text-muted-foreground shrink-0 tabular-nums"
                                  dateTime={n.created_at}
                                >
                                  {formatFeedWhen(n.created_at)}
                                </time>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  onNotificationClick(n)
                                  onClose()
                                }}
                                className={`surface-card border-subtle rounded-spacing-2 hover:bg-hover-subtle px-spacing-4 py-spacing-4 sm:px-spacing-5 sm:py-spacing-4 w-full border text-left transition-colors ${
                                  n.read_at ? 'opacity-75' : ''
                                }`}
                              >
                                <MarkdownRenderer className="body-2 text-foreground max-w-none [&_p:last-child]:mb-0 [&_p]:mb-2">
                                  {notificationMarkdownSource(n.title)}
                                </MarkdownRenderer>
                                {n.body ? (
                                  <MarkdownRenderer
                                    muted
                                    className="body-3 text-muted-foreground mt-spacing-3 max-w-none [&_p:last-child]:mb-0 [&_p]:mb-2"
                                  >
                                    {notificationMarkdownSource(n.body)}
                                  </MarkdownRenderer>
                                ) : null}
                                {n.action_url ? (
                                  <p className="typo-caption text-primary mt-spacing-3">
                                    Open related page →
                                  </p>
                                ) : null}
                              </button>
                              {retryJobId ? (
                                <button
                                  type="button"
                                  disabled={retryingJobId === retryJobId}
                                  onClick={async () => {
                                    setRetryingJobId(retryJobId)
                                    try {
                                      await retryBrainImportJobFromNotification(retryJobId)
                                      toast.success("Got it. I'm retrying that import.")
                                    } catch (error) {
                                      toast.error(
                                        error instanceof Error
                                          ? error.message
                                          : "Couldn't retry that import.",
                                      )
                                    } finally {
                                      setRetryingJobId(null)
                                    }
                                  }}
                                  className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 mt-spacing-2 font-medium disabled:opacity-50"
                                >
                                  {retryingJobId === retryJobId ? 'Retrying...' : 'Retry import'}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      )
                    }

                    const p = item.data
                    return (
                      <li key={`a-${p.id}`} className="pb-spacing-6 relative last:pb-0">
                        <div className="gap-spacing-3 flex">
                          <div className="relative flex h-6 w-4 shrink-0 flex-col items-center">
                            <span className="indicator-dot-glass-purple relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[var(--color-card)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="gap-spacing-2 mb-2 flex flex-wrap items-baseline justify-between gap-y-1">
                              <span className="typo-caption text-muted-foreground font-medium">
                                Awareness
                                {p.point_type ? (
                                  <span className="text-muted-foreground/80">
                                    {' '}
                                    · {p.point_type}
                                  </span>
                                ) : null}
                              </span>
                              <time
                                className="typo-caption text-muted-foreground shrink-0 tabular-nums"
                                dateTime={p.created_at}
                              >
                                {formatFeedWhen(p.created_at)}
                              </time>
                            </div>
                            <div
                              className={`surface-card border-subtle rounded-spacing-2 px-spacing-4 py-spacing-4 sm:px-spacing-5 sm:py-spacing-4 border ${
                                p.read_at ? 'opacity-75' : ''
                              }`}
                            >
                              <MarkdownRenderer className="body-2 text-foreground max-w-none [&_p:last-child]:mb-0 [&_p]:mb-2">
                                {notificationMarkdownSource(p.content)}
                              </MarkdownRenderer>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
