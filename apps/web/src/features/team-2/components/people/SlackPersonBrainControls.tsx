'use client'

import { useMemo, useState } from 'react'
import { Brain, CircleUserRound, Link2, UserRoundCheck } from 'lucide-react'
import type { SlackDiscoveredPerson, SlackPortalUser } from '../../services/slack-people.service'

interface SlackPersonBrainControlsProps {
  person: SlackDiscoveredPerson
  portalUsers: SlackPortalUser[]
  onConfirmIdentity: () => void
  onMapIdentity: (userId: string) => Promise<void>
  onCreateBrain: () => Promise<void>
}

export function SlackPersonBrainControls({
  person,
  portalUsers,
  onConfirmIdentity,
  onMapIdentity,
  onCreateBrain,
}: SlackPersonBrainControlsProps) {
  const [selectedUserId, setSelectedUserId] = useState(person.suggested_vibey_user_id ?? '')
  const [working, setWorking] = useState<'map' | 'brain' | null>(null)
  const portalUser = useMemo(
    () => portalUsers.find((candidate) => candidate.user_id === person.vibey_user_id) ?? null,
    [person.vibey_user_id, portalUsers],
  )

  const run = async (kind: 'map' | 'brain', action: () => Promise<void>) => {
    if (working) return
    setWorking(kind)
    try {
      await action()
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="gap-spacing-4 flex flex-col">
      <section className="bg-secondary p-spacing-4 rounded-spacing-3">
        <div className="gap-spacing-2 flex items-center">
          <Brain className="icon-sm text-primary" />
          <h3 className="body-2 text-foreground font-semibold">Person Brain</h3>
        </div>
        {person.brain_id ? (
          <>
            <p className="body-3 text-foreground mt-spacing-3">
              {person.brain_name || 'Person Brain'}
            </p>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              {person.brain_kind === 'managed_person'
                ? 'Organization-managed User Brain for this person. Customer and campaign context can link here without redefining who they are.'
                : 'Connected to this portal teammate’s canonical User Brain.'}
            </p>
            <span className="badge-glass badge-glass-green body-4 mt-spacing-3 inline-flex">
              Brain on
            </span>
          </>
        ) : (
          <p className="body-4 text-muted-foreground mt-spacing-3">
            {person.vibey_user_id
              ? 'This portal teammate has no accessible User Brain yet.'
              : 'Map this person to a portal teammate or create a new Person Brain for their Slack identity.'}
          </p>
        )}
      </section>

      <section className="surface-card border-border p-spacing-4 rounded-spacing-3 border">
        <div className="gap-spacing-2 flex items-center">
          {person.vibey_user_id ? (
            <UserRoundCheck className="icon-sm text-success" />
          ) : (
            <CircleUserRound className="icon-sm text-muted-foreground" />
          )}
          <h3 className="body-2 text-foreground font-semibold">Portal identity</h3>
        </div>
        {person.vibey_user_id ? (
          <>
            <p className="body-3 text-foreground mt-spacing-3">
              {portalUser?.display_name || person.email || 'Mapped portal user'}
            </p>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              Connected by {person.identity_match_method.replaceAll('_', ' ')}.
            </p>
          </>
        ) : (
          <>
            <label className="body-4 text-muted-foreground mt-spacing-3 block">
              Map to active portal user
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="input-glass body-3 text-foreground mt-spacing-2 w-full"
              >
                <option value="">Choose a portal user</option>
                {portalUsers.map((candidate) => (
                  <option key={candidate.user_id} value={candidate.user_id}>
                    {candidate.display_name}
                    {candidate.email ? ` · ${candidate.email}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!selectedUserId || working !== null}
              onClick={() => void run('map', () => onMapIdentity(selectedUserId))}
              className="button-compact button-glass-primary mt-spacing-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Link2 className="icon-xs" /> Map user & connect Brain
            </button>
            {person.suggested_vibey_user_id ? (
              <button
                type="button"
                onClick={onConfirmIdentity}
                className="button-compact button-glass-neutral mt-spacing-2"
              >
                Confirm suggested match
              </button>
            ) : null}
            <div className="border-border mt-spacing-4 border-t" />
            <p className="body-4 text-muted-foreground mt-spacing-3">
              Not a portal teammate? Create a Person Brain for this Slack identity instead.
            </p>
            <button
              type="button"
              disabled={working !== null}
              onClick={() => void run('brain', onCreateBrain)}
              className="button-compact button-glass-neutral mt-spacing-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Brain className="icon-xs" /> Create new Person Brain
            </button>
          </>
        )}
      </section>
    </div>
  )
}
