'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { routeRecommendation } from '../config/work-context.config'
import {
  addRecDismissedSurface,
  readRecDismissedSurfaces,
  type GlobalWorkSurface,
} from '../lib/global-chat-storage'
import { useGlobalChatStore } from '../store/use-global-chat-store'

export function ChatSurfaceRecommendation() {
  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const surface = useGlobalChatStore((s) => s.workContext.surface)
  const requestAgentSwitch = useGlobalChatStore((s) => s.requestAgentSwitch)
  const roster = useGlobalChatStore((s) => s.roster)
  const [dismissedSurfaces, setDismissedSurfaces] = useState<GlobalWorkSurface[]>(() =>
    readRecDismissedSurfaces(),
  )
  const [dismissedForSession, setDismissedForSession] = useState(false)
  const [showFollowUpActions, setShowFollowUpActions] = useState(false)
  const [nameDetailOpen, setNameDetailOpen] = useState(false)

  const openNameDetail = () => setNameDetailOpen(true)
  const closeNameDetail = () => setNameDetailOpen(false)

  const rec = routeRecommendation(surface, activeAgentKey)

  useEffect(() => {
    setDismissedForSession(false)
    setShowFollowUpActions(false)
    setNameDetailOpen(false)
  }, [surface])

  const agentLabel = useMemo(() => {
    if (!rec) return ''
    const rosterName = roster.find(
      (entry) => entry.kind === 'agent' && entry.agent_key === rec.suggestedAgentKey,
    )?.display_name
    return rosterName?.trim() || rec.agentName
  }, [rec, roster])

  if (dismissedSurfaces.includes(surface)) return null
  if (!rec) return null

  const suggestedInstalled =
    rec.suggestedAgentKey === 'vibey' ||
    roster.some((entry) => entry.kind === 'agent' && entry.agent_key === rec.suggestedAgentKey)
  if (!suggestedInstalled) return null

  const handleDontShowAgain = () => {
    setDismissedSurfaces(addRecDismissedSurface(surface))
    setShowFollowUpActions(false)
  }

  const handleDismiss = () => {
    setDismissedForSession(true)
    setShowFollowUpActions(true)
    setNameDetailOpen(false)
  }

  const handleRemindLater = () => {
    setShowFollowUpActions(false)
  }

  if (dismissedForSession && !showFollowUpActions) return null

  return (
    <div
      className="chat-surface-rec-banner mx-2 mb-2 shrink-0"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setNameDetailOpen(false)
        }
      }}
    >
      {!dismissedForSession ? (
        <div onMouseLeave={closeNameDetail}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="body-4 text-foreground font-medium leading-snug">
                {rec.headline}{' '}
                <button
                  type="button"
                  className="chat-surface-rec-agent-name"
                  onClick={() => requestAgentSwitch(rec.suggestedAgentKey)}
                  onMouseEnter={openNameDetail}
                  onFocus={openNameDetail}
                  aria-label={`Switch to ${agentLabel}. Hover for details.`}
                  aria-describedby={nameDetailOpen ? 'chat-surface-rec-body' : undefined}
                >
                  {agentLabel}
                </button>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                className="button-glass-accent rounded-spacing-1 px-spacing-2 py-spacing-1 typo-caption font-medium"
                onClick={() => requestAgentSwitch(rec.suggestedAgentKey)}
              >
                Switch
              </button>
              <button type="button" className="chat-surface-rec-dismiss" onClick={handleDismiss}>
                Dismiss
              </button>
            </div>
          </div>
          <p
            id="chat-surface-rec-body"
            className={cn(
              'chat-surface-rec-agent-detail',
              nameDetailOpen && 'chat-surface-rec-agent-detail-open',
            )}
            onMouseEnter={openNameDetail}
          >
            {rec.body}
          </p>
        </div>
      ) : null}
      {dismissedForSession && showFollowUpActions ? (
        <div className="chat-surface-rec-follow-up">
          <button
            type="button"
            className="chat-surface-rec-follow-up-action"
            onClick={handleDontShowAgain}
          >
            Don&apos;t show this again
          </button>
          <button
            type="button"
            className="chat-surface-rec-follow-up-action"
            onClick={handleRemindLater}
          >
            Remind me later
          </button>
        </div>
      ) : null}
    </div>
  )
}
