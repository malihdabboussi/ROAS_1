'use client'

import { FilePenLine, MessagesSquare, Route } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import type { FlowDraftBuildLink } from '../types/flow-build-session-link.types'

export function FlowDraftCardActions({
  link,
  onPlan,
  onDraft,
  onSession,
  compact = false,
}: {
  link: FlowDraftBuildLink
  onPlan: () => void
  onDraft: () => void
  onSession: () => void
  compact?: boolean
}) {
  return (
    <div
      className={`gap-spacing-2 flex flex-wrap ${compact ? 'justify-end' : 'justify-start sm:justify-end'}`}
    >
      <Tooltip
        label={link.sessionId ? FLOWS_UI.openPlan : FLOWS_UI.noBuildSession}
        side="top"
        triggerClassName="inline-flex"
      >
        <span className="inline-flex">
          <button
            type="button"
            disabled={!link.sessionId}
            onClick={(event) => {
              event.stopPropagation()
              onPlan()
            }}
            aria-label={FLOWS_UI.openPlan}
            className="btn-icon-bare disabled:opacity-40"
          >
            <Route className="icon-sm" />
          </button>
        </span>
      </Tooltip>
      <Tooltip
        label={link.draftFlowId ? FLOWS_UI.openDraft : FLOWS_UI.noCompiledDraft}
        side="top"
        triggerClassName="inline-flex"
      >
        <span className="inline-flex">
          <button
            type="button"
            disabled={!link.draftFlowId}
            onClick={(event) => {
              event.stopPropagation()
              onDraft()
            }}
            aria-label={FLOWS_UI.openDraft}
            className="btn-icon-bare disabled:opacity-40"
          >
            <FilePenLine className="icon-sm" />
          </button>
        </span>
      </Tooltip>
      <Tooltip
        label={link.conversationId ? FLOWS_UI.openSession : FLOWS_UI.noConversation}
        side="top"
        triggerClassName="inline-flex"
      >
        <span className="inline-flex">
          <button
            type="button"
            disabled={!link.conversationId}
            onClick={(event) => {
              event.stopPropagation()
              onSession()
            }}
            aria-label={FLOWS_UI.openSession}
            className="btn-icon-bare disabled:opacity-40"
          >
            <MessagesSquare className="icon-sm" />
          </button>
        </span>
      </Tooltip>
    </div>
  )
}
