'use client'

import { createPortal } from 'react-dom'
import type { MissionAgentWorkflow } from '@/lib/agents'
import { fixedFloatingPortalStyle } from '@/lib/ui'

const PEEK_GAP = 8
const PEEK_CARD_W = 280

export type AgentInfoSkillPeekWorkflow =
  | Pick<MissionAgentWorkflow, 'steps' | 'workflow_key'>
  | null

export type AgentInfoSkillPeekPayload = {
  top: number
  left: number
  title: string
  body: string
  workflowSteps: Array<{ order: number; name: string }> | null
  workflowKey: string | null
}

type AgentInfoSkillPeekPortalProps = {
  peek: AgentInfoSkillPeekPayload | null
  onPeekEnter: () => void
  onPeekLeave: () => void
}

function computePeekLeft(anchor: DOMRect): number {
  if (typeof window === 'undefined') {
    return anchor.left - PEEK_CARD_W
  }
  const margin = 16
  const preferLeft = anchor.left - PEEK_CARD_W
  if (preferLeft >= margin) {
    return preferLeft
  }
  const alternateRight = anchor.right + PEEK_GAP
  if (alternateRight + PEEK_CARD_W <= window.innerWidth - margin) {
    return alternateRight
  }
  return margin
}

export function buildAgentInfoSkillPeek(
  el: HTMLElement,
  title: string,
  body: string,
  workflow: AgentInfoSkillPeekWorkflow,
): AgentInfoSkillPeekPayload {
  const rect = el.getBoundingClientRect()
  const steps =
    workflow && Array.isArray(workflow.steps) && workflow.steps.length > 0
      ? (workflow.steps as Array<{ order: number; name: string }>)
      : null
  return {
    top: rect.top + rect.height / 2,
    left: computePeekLeft(rect),
    title,
    body: body.trim() ? body.trim() : 'No description.',
    workflowSteps: steps,
    workflowKey: workflow?.workflow_key ?? null,
  }
}

export function AgentInfoSkillPeekPortal({
  peek,
  onPeekEnter,
  onPeekLeave,
}: AgentInfoSkillPeekPortalProps) {
  if (typeof document === 'undefined' || !peek) {
    return null
  }

  return createPortal(
    <div
      className="z-dropdown surface-card border-border rounded-spacing-2 body-4 text-foreground p-spacing-3 pointer-events-auto max-h-[min(320px,70vh)] w-[min(280px,calc(100vw-48px))] overflow-y-auto border shadow-xl"
      style={{
        ...fixedFloatingPortalStyle(
          { left: peek.left, top: peek.top },
          { transform: 'translateY(-50%)' },
        ),
        scrollbarWidth: 'none',
      }}
      onMouseEnter={onPeekEnter}
      onMouseLeave={onPeekLeave}
    >
      <p className="body-3 text-foreground font-semibold">{peek.title}</p>
      {peek.workflowKey ? (
        <span className="badge-glass badge-glass-muted badge-glass-sm mt-spacing-2 inline-flex">
          /{peek.workflowKey}
        </span>
      ) : null}
      <p className="body-4 text-muted-foreground mt-spacing-2">{peek.body}</p>
      {peek.workflowSteps && peek.workflowSteps.length > 0 ? (
        <div className="mt-spacing-2 pt-spacing-2 flex flex-wrap gap-1 border-t border-border">
          {peek.workflowSteps.map((step) => (
            <span
              key={step.order}
              className="badge-glass badge-glass-sm body-4 text-muted-foreground"
            >
              {step.order}. {step.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
