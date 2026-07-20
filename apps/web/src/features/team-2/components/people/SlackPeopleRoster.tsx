'use client'

import { useMemo, useState } from 'react'
import { Brain, CircleUserRound, Search, UserRoundCheck } from 'lucide-react'
import type { SlackDiscoveredPerson } from '../../services/slack-people.service'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function relationshipLabel(person: SlackDiscoveredPerson): string {
  if (person.relationship_kind === 'internal') return 'Internal'
  if (person.relationship_kind === 'external') return 'External'
  return 'Ignored'
}

interface SlackPeopleRosterProps {
  people: SlackDiscoveredPerson[]
  onOpenPerson: (person: SlackDiscoveredPerson) => void
}

export function SlackPeopleRoster({ people, onOpenPerson }: SlackPeopleRosterProps) {
  const [search, setSearch] = useState('')
  const visiblePeople = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return people
    return people.filter((person) =>
      [person.display_name, person.email, person.title, person.username]
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
            Open a person to manage their Shadow conversation, identity and Brain connection.
          </p>
        </div>
        <label className="input-glass gap-spacing-2 flex items-center">
          <Search className="icon-xs text-muted-foreground" />
          <span className="sr-only">Search people</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people"
            className="body-3 text-foreground min-w-0 bg-transparent outline-none"
          />
        </label>
      </div>

      {visiblePeople.length === 0 ? (
        <p className="body-3 text-muted-foreground p-spacing-6 text-center">
          No people match this search.
        </p>
      ) : (
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
                <span className="body-4 text-muted-foreground mt-auto capitalize">
                  {relationshipLabel(person)} · {person.delivery_mode}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
