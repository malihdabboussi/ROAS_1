'use client'

import { useState } from 'react'
import { ArrowLeft, MessagesSquare, Radio } from 'lucide-react'
import type { SlackDiscoveredPerson, SlackShadowAction } from '../../services/slack-people.service'
import { SlackShadowInbox } from './SlackShadowInbox'

interface SlackShadowConversationViewProps {
  actions: SlackShadowAction[]
  peopleById: Map<string, SlackDiscoveredPerson>
  onBack: () => void
  onOpenPerson: (person: SlackDiscoveredPerson) => void
  onOpenSignals: () => void
  onReview: (id: string, status: 'approved' | 'dismissed') => void
  onSend: (id: string) => void
}

export function SlackShadowConversationView({
  actions,
  peopleById,
  onBack,
  onOpenPerson,
  onOpenSignals,
  onReview,
  onSend,
}: SlackShadowConversationViewProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const personActions = actions.filter(
    (action) => Boolean(action.target_member_id) && peopleById.has(action.target_member_id ?? ''),
  )
  const teamSignals = actions.filter((action) => !action.target_member_id)
  const conversationPeople = Array.from(
    new Map(
      personActions.flatMap((action) => {
        const person = peopleById.get(action.target_member_id ?? '')
        return person ? [[person.id, person] as const] : []
      }),
    ).values(),
  )
  const selectedPerson = selectedPersonId ? (peopleById.get(selectedPersonId) ?? null) : null
  const visibleActions = selectedPersonId
    ? personActions.filter((action) => action.target_member_id === selectedPersonId)
    : personActions

  return (
    <div className="gap-spacing-4 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="gap-spacing-4 flex shrink-0 flex-col">
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
            Review every proposed message in one inbox. Select a person to filter their activity, or
            open the complete conversation beside their real Slack history.
          </p>
        </header>

        {teamSignals.length > 0 ? (
          <section className="surface-card border-border p-spacing-4 rounded-spacing-4 border">
            <div className="gap-spacing-3 flex flex-wrap items-center justify-between">
              <div className="gap-spacing-2 flex min-w-0 items-start">
                <Radio className="icon-sm text-primary mt-spacing-1 shrink-0" />
                <div>
                  <h2 className="body-2 text-foreground font-semibold">
                    {teamSignals.length} team{' '}
                    {teamSignals.length === 1 ? 'signal needs' : 'signals need'} routing
                  </h2>
                  <p className="body-4 text-muted-foreground mt-spacing-1">
                    Review the evidence and tell Pixel which internal teammate should handle each
                    one.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenSignals}
                className="button-compact button-glass-primary"
              >
                Review Signals
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <section className="surface-card border-border rounded-spacing-4 grid min-h-0 min-w-0 flex-1 overflow-hidden border lg:grid-cols-3">
        <aside className="border-border flex min-h-0 min-w-0 flex-col border-r lg:col-span-1">
          <div className="border-border p-spacing-3 border-b">
            <div className="gap-spacing-2 flex items-center">
              <MessagesSquare className="icon-sm text-primary" />
              <h2 className="body-3 text-foreground font-semibold">Shadow activity</h2>
            </div>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              {personActions.length} proposals across {conversationPeople.length} people
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <button
              type="button"
              onClick={() => setSelectedPersonId(null)}
              className={`border-border p-spacing-3 gap-spacing-2 flex w-full items-center border-b text-left ${
                selectedPersonId === null ? 'bg-secondary' : 'hover:bg-hover-subtle'
              }`}
            >
              <span className="body-3 text-foreground min-w-0 flex-1 truncate font-medium">
                All activity
              </span>
              <span className="badge-glass badge-glass-muted body-4">{personActions.length}</span>
            </button>
            {conversationPeople.map((person) => {
              const count = personActions.filter(
                (action) => action.target_member_id === person.id,
              ).length
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedPersonId(person.id)}
                  className={`border-border p-spacing-3 gap-spacing-2 flex w-full items-center border-b text-left ${
                    selectedPersonId === person.id ? 'bg-secondary' : 'hover:bg-hover-subtle'
                  }`}
                  aria-label={`${person.display_name}, ${count} ${
                    count === 1 ? 'proposal' : 'proposals'
                  }`}
                >
                  <span className="body-3 text-foreground min-w-0 flex-1 truncate font-medium">
                    {person.display_name}
                  </span>
                  <span className="badge-glass badge-glass-muted body-4">{count}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden lg:col-span-2">
          {selectedPerson ? (
            <div className="border-border p-spacing-3 gap-spacing-3 flex items-center justify-between border-b">
              <div className="min-w-0">
                <p className="body-3 text-foreground truncate font-semibold">
                  {selectedPerson.display_name}
                </p>
                <p className="body-4 text-muted-foreground">Filtered Shadow ledger</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenPerson(selectedPerson)}
                className="button-compact button-glass-neutral shrink-0"
              >
                Open conversation
              </button>
            </div>
          ) : null}
          <SlackShadowInbox
            actions={visibleActions}
            peopleById={peopleById}
            title={selectedPerson ? `${selectedPerson.display_name}'s proposals` : 'All proposals'}
            description={
              selectedPerson
                ? 'Review this person’s pending, approved, and delivered agent messages.'
                : 'Select a person on the left to focus their proposal ledger.'
            }
            onOpenPerson={onOpenPerson}
            onReview={onReview}
            onSend={onSend}
          />
        </div>
      </section>
    </div>
  )
}
