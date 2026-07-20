'use client'

import { Brain, CircleUserRound, UserRoundCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type {
  SlackDeliveryMode,
  SlackDiscoveredPerson,
  SlackRelationshipKind,
} from '../../services/slack-people.service'

const RELATIONSHIP_LABELS: Record<SlackRelationshipKind, string> = {
  internal: 'Internal',
  external: 'External',
  ignored: 'Ignored',
}

const MODE_LABELS: Record<SlackDeliveryMode, string> = {
  off: 'Off',
  shadow: 'Shadow',
  active: 'Active',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

interface SlackPeopleRosterProps {
  people: SlackDiscoveredPerson[]
  onOpenPerson: (person: SlackDiscoveredPerson) => void
  onUpdateDeliveryMode: (id: string, mode: SlackDeliveryMode) => void
  onUpdateRelationshipKind: (id: string, kind: SlackRelationshipKind) => void
  onCreateTestProposal: (id: string) => void
}

export function SlackPeopleRoster({
  people,
  onOpenPerson,
  onUpdateDeliveryMode,
  onUpdateRelationshipKind,
  onCreateTestProposal,
}: SlackPeopleRosterProps) {
  return (
    <section className="surface-card border-border rounded-spacing-4 overflow-hidden border">
      <div className="border-border p-spacing-4 border-b">
        <h2 className="body-2 text-foreground font-semibold">Slack people</h2>
        <p className="body-4 text-muted-foreground mt-spacing-1">
          Person type describes your relationship. Delivery mode controls what the agent may do.
        </p>
      </div>
      <div className="divide-border divide-y">
        {people.map((person) => (
          <div key={person.id} className="gap-spacing-3 p-spacing-4 flex flex-wrap items-center">
            <button
              type="button"
              aria-label={`Open ${person.display_name}`}
              onClick={() => onOpenPerson(person)}
              className="gap-spacing-3 flex min-w-0 flex-1 items-center text-left"
            >
              <span className="bg-secondary text-secondary-foreground h-spacing-10 w-spacing-10 body-4 flex shrink-0 items-center justify-center rounded-full font-semibold">
                {initials(person.display_name) || '?'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="gap-spacing-2 flex items-center">
                  <span className="body-2 text-foreground truncate font-medium">
                    {person.display_name}
                  </span>
                  {person.vibey_user_id ? (
                    <UserRoundCheck
                      className="icon-sm text-success shrink-0"
                      aria-label="Portal user"
                    />
                  ) : (
                    <CircleUserRound
                      className="icon-sm text-muted-foreground shrink-0"
                      aria-label="Slack-only person"
                    />
                  )}
                  {person.brain_id ? <Brain className="icon-sm text-primary shrink-0" /> : null}
                </span>
                <span className="body-4 text-muted-foreground block truncate">
                  {RELATIONSHIP_LABELS[person.relationship_kind]}
                  {person.vibey_user_id ? ' · Portal user' : ' · Slack-only person'}
                  {person.title ? ` · ${person.title}` : ''}
                </span>
              </span>
            </button>

            <div
              className="bg-secondary p-spacing-1 rounded-spacing-2 flex"
              aria-label="Person type"
            >
              {(Object.keys(RELATIONSHIP_LABELS) as SlackRelationshipKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-label={`Mark ${person.display_name} ${kind}`}
                  onClick={() => onUpdateRelationshipKind(person.id, kind)}
                  className={cn(
                    'body-4 px-spacing-2 py-spacing-1 rounded-spacing-1 font-medium transition-colors',
                    person.relationship_kind === kind
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {RELATIONSHIP_LABELS[kind]}
                </button>
              ))}
            </div>

            <div
              className="bg-secondary p-spacing-1 rounded-spacing-2 flex"
              aria-label="Delivery mode"
            >
              {(Object.keys(MODE_LABELS) as SlackDeliveryMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateDeliveryMode(person.id, mode)}
                  className={cn(
                    'body-4 px-spacing-2 py-spacing-1 rounded-spacing-1 font-medium transition-colors',
                    person.delivery_mode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={person.delivery_mode === 'off' || person.relationship_kind === 'ignored'}
              aria-label={`Create test proposal for ${person.display_name}`}
              onClick={() => onCreateTestProposal(person.id)}
              className="button-compact button-glass-neutral disabled:cursor-not-allowed disabled:opacity-50"
            >
              Test proposal
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
