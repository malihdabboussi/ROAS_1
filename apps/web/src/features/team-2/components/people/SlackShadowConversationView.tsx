'use client'

import { ArrowLeft, MessagesSquare } from 'lucide-react'
import type { SlackDiscoveredPerson, SlackShadowAction } from '../../services/slack-people.service'
import { SlackShadowInbox } from './SlackShadowInbox'

interface SlackShadowConversationViewProps {
  actions: SlackShadowAction[]
  peopleById: Map<string, SlackDiscoveredPerson>
  onBack: () => void
  onOpenPerson: (person: SlackDiscoveredPerson) => void
  onReview: (id: string, status: 'approved' | 'dismissed') => void
  onSend: (id: string) => void
}

export function SlackShadowConversationView({
  actions,
  peopleById,
  onBack,
  onOpenPerson,
  onReview,
  onSend,
}: SlackShadowConversationViewProps) {
  const conversationPeople = Array.from(
    new Map(
      actions.flatMap((action) => {
        const person = peopleById.get(action.target_member_id ?? '')
        return person ? [[person.id, person] as const] : []
      }),
    ).values(),
  )

  return (
    <div className="gap-spacing-4 flex flex-col">
      <button
        type="button"
        onClick={onBack}
        className="button-compact button-glass-neutral self-start"
      >
        <ArrowLeft className="icon-xs" /> Back to People
      </button>

      <header>
        <p className="eyebrow text-muted-foreground">Safe message review</p>
        <h1 className="title-h4 text-foreground mt-spacing-1">SHADOW CONVERSATIONS</h1>
        <p className="body-3 text-muted-foreground mt-spacing-2 max-w-2xl">
          Review every proposed message here. Open a person to see their complete Shadow ledger
          beside the real Slack conversation.
        </p>
      </header>

      <section className="surface-card border-border p-spacing-4 rounded-spacing-4 border">
        <div className="gap-spacing-2 flex items-center">
          <MessagesSquare className="icon-sm text-primary" />
          <h2 className="body-2 text-foreground font-semibold">People with Shadow activity</h2>
        </div>
        {conversationPeople.length === 0 ? (
          <p className="body-3 text-muted-foreground mt-spacing-3">
            Conversations appear here after the first proposal is created for a person.
          </p>
        ) : (
          <div className="mt-spacing-3 gap-spacing-2 flex flex-wrap">
            {conversationPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => onOpenPerson(person)}
                className="button-compact button-glass-neutral"
              >
                {person.display_name}
              </button>
            ))}
          </div>
        )}
      </section>

      <SlackShadowInbox
        actions={actions}
        peopleById={peopleById}
        onOpenPerson={onOpenPerson}
        onReview={onReview}
        onSend={onSend}
      />
    </div>
  )
}
