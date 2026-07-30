'use client'

import { Workflow } from 'lucide-react'
import { SLACK_PEOPLE_MESSAGES } from '../../config/messages.config'
import type { SlackDiscoveredPerson, SlackShadowAction } from '../../services/slack-people.service'

interface SlackShadowInboxProps {
  actions: SlackShadowAction[]
  peopleById: Map<string, SlackDiscoveredPerson>
  title?: string
  description?: string
  onOpenPerson: (person: SlackDiscoveredPerson) => void
  onReview: (id: string, status: 'approved' | 'dismissed') => void
  onSend: (id: string) => void
}

export function SlackShadowInbox({
  actions,
  peopleById,
  title = 'Shadow inbox',
  description,
  onOpenPerson,
  onReview,
  onSend,
}: SlackShadowInboxProps) {
  return (
    <section className="surface-card border-border scroll-mt-spacing-6 rounded-spacing-4 min-w-0 overflow-hidden border">
      <div className="border-border p-spacing-4 border-b">
        <div className="gap-spacing-2 flex items-center">
          <Workflow className="icon-sm text-primary" />
          <h2 className="body-2 text-foreground min-w-0 truncate font-semibold">{title}</h2>
        </div>
        <p className="body-4 text-muted-foreground mt-spacing-1">
          {description ??
            `${SLACK_PEOPLE_MESSAGES.SHADOW_SAFETY} Open the person to see this ledger beside the real Slack conversation.`}
        </p>
      </div>
      {actions.length === 0 ? (
        <p className="body-3 text-muted-foreground p-spacing-6">
          New message and workflow proposals will appear here before anything is delivered.
        </p>
      ) : (
        <div className="divide-border divide-y">
          {actions.map((action) => {
            const person = peopleById.get(action.target_member_id ?? '')
            const isPostCall = action.metadata?.source === 'meeting_follow_up_assignee_reminder'
            return (
              <article key={action.id} className="p-spacing-4 min-w-0 overflow-hidden">
                <div className="gap-spacing-3 flex items-center justify-between">
                  {person ? (
                    <button
                      type="button"
                      onClick={() => onOpenPerson(person)}
                      className="body-2 text-foreground font-medium hover:underline"
                    >
                      {person.display_name}
                    </button>
                  ) : null}
                  <span className="badge-glass badge-glass-muted body-4 capitalize">
                    {action.status}
                  </span>
                </div>
                {isPostCall ? (
                  <div className="mt-spacing-2 gap-spacing-2 flex flex-wrap items-center">
                    <span className="badge-glass badge-glass-blue body-4">Post-call follow-up</span>
                    {typeof action.metadata?.call_title === 'string' ? (
                      <span className="body-4 text-muted-foreground">
                        {action.metadata.call_title}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <p className="body-3 text-foreground mt-spacing-2 min-w-0 whitespace-pre-wrap break-words">
                  {action.proposed_content}
                </p>
                {action.rationale ? (
                  <p className="body-4 text-muted-foreground mt-spacing-2 min-w-0 break-words">
                    {action.rationale}
                  </p>
                ) : null}
                {action.status === 'proposed' ? (
                  <div className="mt-spacing-3 gap-spacing-2 flex flex-wrap">
                    <button
                      type="button"
                      onClick={() => onReview(action.id, 'approved')}
                      className="button-compact button-glass-primary"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReview(action.id, 'dismissed')}
                      className="button-compact button-glass-neutral"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}
                {action.status === 'approved' && action.action_kind === 'message' ? (
                  person?.delivery_mode === 'active' ? (
                    <button
                      type="button"
                      onClick={() => onSend(action.id)}
                      className="button-compact button-glass-primary mt-spacing-3"
                    >
                      Send to Slack DM
                    </button>
                  ) : (
                    <p className="body-4 text-muted-foreground mt-spacing-3">
                      Set this person to Active before sending to their Slack DM.
                    </p>
                  )
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
