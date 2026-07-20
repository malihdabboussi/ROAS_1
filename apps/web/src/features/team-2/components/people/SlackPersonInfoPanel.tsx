'use client'

import { useMemo, useState } from 'react'
import { Brain, CircleUserRound, Link2, UserRoundCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type {
  SlackDeliveryMode,
  SlackDiscoveredPerson,
  SlackPortalUser,
  SlackRelationshipKind,
  SlackShadowAction,
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

interface SlackPersonInfoPanelProps {
  person: SlackDiscoveredPerson
  portalUsers: SlackPortalUser[]
  messageCount: number
  actions: SlackShadowAction[]
  onUpdateDeliveryMode: (mode: SlackDeliveryMode) => void
  onUpdateRelationshipKind: (kind: SlackRelationshipKind) => void
  onConfirmIdentity: () => void
  onMapIdentity: (userId: string) => Promise<void>
}

export function SlackPersonInfoPanel({
  person,
  portalUsers,
  messageCount,
  actions,
  onUpdateDeliveryMode,
  onUpdateRelationshipKind,
  onConfirmIdentity,
  onMapIdentity,
}: SlackPersonInfoPanelProps) {
  const [tab, setTab] = useState<'info' | 'brain'>('info')
  const [selectedUserId, setSelectedUserId] = useState(person.suggested_vibey_user_id ?? '')
  const [mapping, setMapping] = useState(false)
  const portalUser = useMemo(
    () => portalUsers.find((candidate) => candidate.user_id === person.vibey_user_id) ?? null,
    [person.vibey_user_id, portalUsers],
  )
  const sentCount = actions.filter((action) => action.status === 'sent').length

  const mapIdentity = async () => {
    if (!selectedUserId || mapping) return
    setMapping(true)
    try {
      await onMapIdentity(selectedUserId)
    } finally {
      setMapping(false)
    }
  }

  return (
    <aside className="card-glass rounded-spacing-4 flex h-full min-h-0 w-full flex-col overflow-hidden border-0">
      <div className="p-spacing-4 border-border shrink-0 border-b text-center">
        <div className="bg-secondary h-spacing-16 w-spacing-16 mx-auto flex items-center justify-center overflow-hidden rounded-full">
          {person.avatar_url ? (
            <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="title-h6 text-muted-foreground">
              {person.display_name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <h2 className="title-h6 text-foreground mt-spacing-3 truncate">{person.display_name}</h2>
        <p className="body-4 text-muted-foreground mt-spacing-1">
          {person.title || person.email || 'Slack person'}
        </p>
        <div className="mt-spacing-3 gap-spacing-2 flex justify-center">
          <span className="badge-glass badge-glass-muted body-4 capitalize">
            {person.relationship_kind}
          </span>
          <span className="badge-glass badge-glass-green body-4 capitalize">
            {person.delivery_mode}
          </span>
        </div>
      </div>

      <div className="px-spacing-3 py-spacing-2 gap-spacing-1 flex shrink-0">
        {(['info', 'brain'] as const).map((nextTab) => (
          <button
            key={nextTab}
            type="button"
            onClick={() => setTab(nextTab)}
            className={cn(
              'body-3 px-spacing-3 py-spacing-2 rounded-spacing-2 flex-1 capitalize transition-colors',
              tab === nextTab
                ? 'bg-secondary text-foreground font-medium'
                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
            )}
          >
            {nextTab}
          </button>
        ))}
      </div>

      <div className="p-spacing-3 min-h-0 flex-1 overflow-y-auto">
        {tab === 'info' ? (
          <div className="gap-spacing-4 flex flex-col">
            <section className="gap-spacing-2 grid grid-cols-3">
              <div className="bg-secondary p-spacing-3 rounded-spacing-3 text-center">
                <p className="title-h6 text-foreground tabular-nums">{messageCount}</p>
                <p className="body-4 text-muted-foreground mt-spacing-1">Messages</p>
              </div>
              <div className="bg-secondary p-spacing-3 rounded-spacing-3 text-center">
                <p className="title-h6 text-foreground tabular-nums">{actions.length}</p>
                <p className="body-4 text-muted-foreground mt-spacing-1">Proposals</p>
              </div>
              <div className="bg-secondary p-spacing-3 rounded-spacing-3 text-center">
                <p className="title-h6 text-foreground tabular-nums">{sentCount}</p>
                <p className="body-4 text-muted-foreground mt-spacing-1">Sent</p>
              </div>
            </section>

            <section>
              <h3 className="body-3 text-foreground font-semibold">Person type</h3>
              <div className="bg-secondary p-spacing-1 rounded-spacing-2 mt-spacing-2 flex">
                {(Object.keys(RELATIONSHIP_LABELS) as SlackRelationshipKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => onUpdateRelationshipKind(kind)}
                    className={cn(
                      'body-4 px-spacing-2 py-spacing-2 rounded-spacing-1 flex-1 font-medium transition-colors',
                      person.relationship_kind === kind
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {RELATIONSHIP_LABELS[kind]}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="body-3 text-foreground font-semibold">Agent delivery</h3>
              <div className="bg-secondary p-spacing-1 rounded-spacing-2 mt-spacing-2 flex">
                {(Object.keys(MODE_LABELS) as SlackDeliveryMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdateDeliveryMode(mode)}
                    className={cn(
                      'body-4 px-spacing-2 py-spacing-2 rounded-spacing-1 flex-1 font-medium transition-colors',
                      person.delivery_mode === mode
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
              <p className="body-4 text-muted-foreground mt-spacing-2">
                Shadow creates reviewable agent drafts. Active only unlocks explicit sends after
                approval.
              </p>
            </section>

            <section className="bg-secondary p-spacing-3 rounded-spacing-3">
              <p className="body-4 text-muted-foreground">Last seen in Slack</p>
              <p className="body-3 text-foreground mt-spacing-1">
                {new Date(person.last_seen_at).toLocaleString()}
              </p>
            </section>
          </div>
        ) : (
          <div className="gap-spacing-4 flex flex-col">
            <section className="bg-secondary p-spacing-4 rounded-spacing-3">
              <div className="gap-spacing-2 flex items-center">
                <Brain className="icon-sm text-primary" />
                <h3 className="body-2 text-foreground font-semibold">Person Brain</h3>
              </div>
              {person.brain_id ? (
                <>
                  <p className="body-3 text-foreground mt-spacing-3">
                    {person.brain_name || 'User Brain'}
                  </p>
                  <p className="body-4 text-muted-foreground mt-spacing-1">
                    Brain is on for this mapped portal identity. This screen reads its status; it
                    does not train another member’s private Brain without their access.
                  </p>
                  <span className="badge-glass badge-glass-green body-4 mt-spacing-3 inline-flex">
                    Brain on
                  </span>
                </>
              ) : (
                <p className="body-4 text-muted-foreground mt-spacing-3">
                  {person.vibey_user_id
                    ? 'This portal user has no accessible User Brain yet. They must enable or share it before this workspace can use it.'
                    : 'Map this Slack identity to a portal user to connect their existing User Brain.'}
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
                    disabled={!selectedUserId || mapping}
                    onClick={() => void mapIdentity()}
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
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
  )
}
