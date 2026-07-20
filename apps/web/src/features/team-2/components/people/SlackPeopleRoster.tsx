'use client'

import { useMemo, useState } from 'react'
import { Brain, CircleUserRound, Grid2X2, List, Search, UserRoundCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type {
  SlackDeliveryMode,
  SlackDiscoveredPerson,
  SlackPortalUser,
  SlackRelationshipKind,
} from '../../services/slack-people.service'
import { SlackPersonBrainControls } from './SlackPersonBrainControls'
import { SlackPersonChannelContext } from './SlackPersonChannelContext'

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

function relationshipLabel(person: SlackDiscoveredPerson): string {
  return RELATIONSHIP_LABELS[person.relationship_kind]
}

interface SlackPeopleRosterProps {
  people: SlackDiscoveredPerson[]
  portalUsers: SlackPortalUser[]
  onOpenPerson: (person: SlackDiscoveredPerson) => void
  onUpdateRelationshipKind: (person: SlackDiscoveredPerson, kind: SlackRelationshipKind) => void
  onUpdateDeliveryMode: (person: SlackDiscoveredPerson, mode: SlackDeliveryMode) => void
  onConfirmIdentity: (person: SlackDiscoveredPerson) => void
  onMapIdentity: (person: SlackDiscoveredPerson, userId: string) => Promise<void>
  onCreateBrain: (person: SlackDiscoveredPerson) => Promise<void>
}

export function SlackPeopleRoster({
  people,
  portalUsers,
  onOpenPerson,
  onUpdateRelationshipKind,
  onUpdateDeliveryMode,
  onConfirmIdentity,
  onMapIdentity,
  onCreateBrain,
}: SlackPeopleRosterProps) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [brainPersonId, setBrainPersonId] = useState<string | null>(null)
  const visiblePeople = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return people
    return people.filter((person) =>
      [
        person.display_name,
        person.email,
        person.title,
        person.username,
        ...(person.slack_channels ?? []),
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    )
  }, [people, search])

  return (
    <section className="gap-spacing-3 flex min-h-0 flex-1 flex-col">
      <div className="gap-spacing-3 flex flex-wrap items-center justify-between">
        <div>
          <h2 className="body-2 text-foreground font-semibold">People</h2>
          <p className="body-4 text-muted-foreground mt-spacing-1">
            Open a person or use List view for quick identity, delivery, and Brain controls.
          </p>
        </div>
        <div className="gap-spacing-2 flex items-center">
          <label className="input-glass gap-spacing-2 flex items-center">
            <Search className="icon-xs text-muted-foreground" />
            <span className="sr-only">Search people</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people"
              className="input-glass body-3 text-foreground min-w-0 bg-transparent outline-none"
            />
          </label>
          <div className="bg-secondary p-spacing-1 rounded-spacing-2 flex">
            <button
              type="button"
              aria-label="Card view"
              onClick={() => setView('cards')}
              className={cn(
                'p-spacing-2 rounded-spacing-1 transition-colors',
                view === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              <Grid2X2 className="icon-sm" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => setView('list')}
              className={cn(
                'p-spacing-2 rounded-spacing-1 transition-colors',
                view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              <List className="icon-sm" />
            </button>
          </div>
        </div>
      </div>

      {visiblePeople.length === 0 ? (
        <p className="body-3 text-muted-foreground p-spacing-6 text-center">
          No people match this search.
        </p>
      ) : view === 'cards' ? (
        <div className="gap-spacing-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {visiblePeople.map((person) => (
            <button
              key={person.id}
              type="button"
              aria-label={`Open ${person.display_name}`}
              onClick={() => onOpenPerson(person)}
              className="border-subtle group/person-card rounded-spacing-3 flex flex-col overflow-hidden text-left transition-opacity hover:opacity-95"
            >
              <span className="bg-muted rounded-t-spacing-3 relative aspect-square w-full overflow-hidden">
                {person.avatar_url ? (
                  <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="title-h4 text-muted-foreground flex h-full items-center justify-center">
                    {initials(person.display_name) || '?'}
                  </span>
                )}
                <span className="surface-card border-subtle gap-spacing-1 p-spacing-1 rounded-spacing-2 absolute right-2 top-2 flex border">
                  {person.vibey_user_id ? (
                    <UserRoundCheck className="icon-sm text-success" aria-label="Portal user" />
                  ) : (
                    <CircleUserRound
                      className="icon-sm text-muted-foreground"
                      aria-label="Slack-only person"
                    />
                  )}
                  {person.brain_id ? (
                    <Brain className="icon-sm text-primary" aria-label="Brain connected" />
                  ) : null}
                </span>
              </span>
              <span className="gap-spacing-1 p-spacing-2 flex min-h-0 flex-1 flex-col">
                <span className="body-2 text-foreground truncate font-medium">
                  {person.display_name}
                </span>
                <span className="body-4 text-muted-foreground line-clamp-2">
                  {person.title || relationshipLabel(person)}
                </span>
                <SlackPersonChannelContext person={person} />
                <span className="body-4 text-muted-foreground mt-auto capitalize">
                  {relationshipLabel(person)} · {person.delivery_mode}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="surface-card border-border rounded-spacing-3 overflow-hidden border">
          {visiblePeople.map((person) => (
            <div key={person.id} className="border-border border-b last:border-b-0">
              <div className="gap-spacing-3 p-spacing-3 flex flex-wrap items-center">
                <button
                  type="button"
                  aria-label={`Open ${person.display_name}`}
                  onClick={() => onOpenPerson(person)}
                  className="gap-spacing-3 flex min-w-48 flex-1 items-center text-left"
                >
                  <span className="bg-secondary body-4 text-muted-foreground h-spacing-10 w-spacing-10 flex shrink-0 items-center justify-center overflow-hidden rounded-full">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(person.display_name) || '?'
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="body-3 text-foreground block truncate font-medium">
                      {person.display_name}
                    </span>
                    <span className="body-4 text-muted-foreground block truncate">
                      {person.title || person.email || 'Slack person'}
                    </span>
                    <SlackPersonChannelContext person={person} />
                  </span>
                </button>

                <div className="bg-secondary p-spacing-1 rounded-spacing-2 flex">
                  {(Object.keys(RELATIONSHIP_LABELS) as SlackRelationshipKind[]).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      aria-label={`Set ${person.display_name} to ${RELATIONSHIP_LABELS[kind]}`}
                      onClick={() => onUpdateRelationshipKind(person, kind)}
                      className={cn(
                        'body-4 px-spacing-2 py-spacing-1 rounded-spacing-1 transition-colors',
                        person.relationship_kind === kind
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {RELATIONSHIP_LABELS[kind]}
                    </button>
                  ))}
                </div>

                <div className="bg-secondary p-spacing-1 rounded-spacing-2 flex">
                  {(Object.keys(MODE_LABELS) as SlackDeliveryMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-label={`Set ${person.display_name} delivery to ${MODE_LABELS[mode]}`}
                      onClick={() => onUpdateDeliveryMode(person, mode)}
                      className={cn(
                        'body-4 px-spacing-2 py-spacing-1 rounded-spacing-1 transition-colors',
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
                  aria-label={`Manage ${person.display_name} Brain`}
                  onClick={() =>
                    setBrainPersonId((current) => (current === person.id ? null : person.id))
                  }
                  className={cn(
                    'button-compact',
                    person.brain_id ? 'button-glass-primary' : 'button-glass-neutral',
                  )}
                >
                  <Brain className="icon-xs" /> Brain
                </button>
              </div>
              {brainPersonId === person.id ? (
                <div className="border-border p-spacing-4 border-t">
                  <SlackPersonBrainControls
                    person={person}
                    portalUsers={portalUsers}
                    onConfirmIdentity={() => onConfirmIdentity(person)}
                    onMapIdentity={(userId) => onMapIdentity(person, userId)}
                    onCreateBrain={() => onCreateBrain(person)}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
