'use client'

import { ArrowRight, Workflow } from 'lucide-react'
import type { SlackDiscoveredPerson, SlackShadowAction } from '../../services/slack-people.service'

interface SlackShadowSummaryProps {
  actions: SlackShadowAction[]
  peopleById: Map<string, SlackDiscoveredPerson>
  onOpen: () => void
}

export function SlackShadowSummary({ actions, peopleById, onOpen }: SlackShadowSummaryProps) {
  const proposedCount = actions.filter((action) => action.status === 'proposed').length
  const approvedCount = actions.filter((action) => action.status === 'approved').length
  const conversationCount = new Set(
    actions.map((action) => action.target_member_id).filter((id): id is string => Boolean(id)),
  ).size
  const latestPeople = Array.from(
    new Set(
      actions
        .map((action) => peopleById.get(action.target_member_id ?? '')?.display_name)
        .filter((name): name is string => Boolean(name)),
    ),
  ).slice(0, 3)

  return (
    <section className="surface-card border-border p-spacing-4 rounded-spacing-4 border">
      <div className="gap-spacing-4 flex flex-wrap items-start justify-between">
        <div>
          <div className="gap-spacing-2 flex items-center">
            <Workflow className="icon-sm text-primary" />
            <h2 className="body-2 text-foreground font-semibold">Shadow conversations</h2>
          </div>
          <p className="body-4 text-muted-foreground mt-spacing-1">
            Review proposed messages and open each person’s Slack conversation and Shadow history.
          </p>
        </div>
        <button type="button" onClick={onOpen} className="button-compact button-glass-primary">
          Open Shadow inbox <ArrowRight className="icon-xs" />
        </button>
      </div>

      <div className="mt-spacing-4 gap-spacing-3 grid sm:grid-cols-3">
        <div className="bg-secondary p-spacing-3 rounded-spacing-3">
          <p className="body-4 text-muted-foreground">Conversations</p>
          <p className="title-h6 text-foreground mt-spacing-1 tabular-nums">{conversationCount}</p>
        </div>
        <div className="bg-secondary p-spacing-3 rounded-spacing-3">
          <p className="body-4 text-muted-foreground">Needs review</p>
          <p className="title-h6 text-foreground mt-spacing-1 tabular-nums">{proposedCount}</p>
        </div>
        <div className="bg-secondary p-spacing-3 rounded-spacing-3">
          <p className="body-4 text-muted-foreground">Approved</p>
          <p className="title-h6 text-foreground mt-spacing-1 tabular-nums">{approvedCount}</p>
        </div>
      </div>

      {latestPeople.length > 0 ? (
        <p className="body-4 text-muted-foreground mt-spacing-3">
          Recent: {latestPeople.join(', ')}
        </p>
      ) : null}
    </section>
  )
}
