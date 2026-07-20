'use client'

import { useRef } from 'react'
import { Bot, MessageSquareText, RefreshCw, UsersRound, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { cn } from '@/lib/utils/cn'
import { SLACK_PEOPLE_MESSAGES } from '../../config/messages.config'
import { useSlackPeople } from '../../hooks/use-slack-people'
import type { SlackDeliveryMode, SlackDiscoveredPerson } from '../../services/slack-people.service'

const MODE_LABELS: Record<SlackDeliveryMode, string> = {
  off: 'Off',
  shadow: 'Shadow',
  active: 'Active',
}

function relationshipLabel(person: SlackDiscoveredPerson): string {
  if (person.relationship_kind === 'team_member') return 'Platform teammate'
  if (person.relationship_kind === 'external') return 'External contact'
  return 'Ghost profile'
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function SlackPeopleView() {
  const shadowInboxRef = useRef<HTMLElement>(null)
  const {
    connected,
    people,
    actions,
    loading,
    error,
    updateDeliveryMode,
    createTestProposal,
    reviewAction,
    sendAction,
    reload,
  } = useSlackPeople()
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const teammateCount = people.filter((person) => person.vibey_user_id).length
  const ghostCount = people.filter((person) => !person.vibey_user_id && !person.contact_id).length

  const createAndRevealTestProposal = async (personId: string) => {
    try {
      await createTestProposal(personId)
      toast.success(SLACK_PEOPLE_MESSAGES.TEST_PROPOSAL_CREATED)
      shadowInboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {
      toast.error(SLACK_PEOPLE_MESSAGES.TEST_PROPOSAL_ERROR)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <VibeyLoadingOrb size="md" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Managed team intelligence
            </p>
            <h1 className="text-foreground mt-1 text-2xl font-semibold">PEOPLE & SHADOW MODE</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              Slack identities become durable people records, then resolve to teammates or external
              contacts as Vibey learns who they are.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="button-glass-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Slack
          </button>
        </header>

        {error ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm">
            {SLACK_PEOPLE_MESSAGES.LOAD_ERROR}
          </div>
        ) : null}

        {!connected ? (
          <div className="surface-card border-border rounded-2xl border p-6">
            <p className="text-foreground font-medium">Slack is not connected</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {SLACK_PEOPLE_MESSAGES.DISCONNECTED}
            </p>
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Discovered people', value: people.length, icon: UsersRound },
                { label: 'Platform teammates', value: teammateCount, icon: Bot },
                { label: 'Ghost profiles', value: ghostCount, icon: MessageSquareText },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="surface-card border-border rounded-xl border p-4">
                  <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                  <p className="text-foreground mt-3 text-2xl font-semibold tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </section>

            <section className="surface-card border-border rounded-2xl border p-4">
              <h2 className="text-foreground text-sm font-semibold">How Shadow mode works</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                {SLACK_PEOPLE_MESSAGES.CURRENT_CAPABILITY}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {SLACK_PEOPLE_MESSAGES.HOW_IT_WORKS.map((step) => (
                  <div key={step.title} className="bg-secondary rounded-xl p-3">
                    <p className="text-foreground text-xs font-semibold">{step.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{step.body}</p>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                {SLACK_PEOPLE_MESSAGES.GHOST_PROFILE_HELP}
              </p>
            </section>

            <section
              ref={shadowInboxRef}
              className="surface-card border-border scroll-mt-6 rounded-2xl border"
            >
              <div className="border-border border-b p-4">
                <div className="flex items-center gap-2">
                  <Workflow className="text-primary h-4 w-4" />
                  <h2 className="text-foreground text-sm font-semibold">Shadow inbox</h2>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {SLACK_PEOPLE_MESSAGES.SHADOW_SAFETY}
                </p>
              </div>
              {actions.length === 0 ? (
                <p className="text-muted-foreground p-6 text-sm">
                  {SLACK_PEOPLE_MESSAGES.EMPTY_ACTIONS}
                </p>
              ) : (
                <div className="divide-border divide-y">
                  {actions.map((action) => (
                    <article key={action.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-foreground text-sm font-medium">
                          {peopleById.get(action.target_member_id ?? '')?.display_name ??
                            'Unknown person'}
                        </p>
                        <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs capitalize">
                          {action.status}
                        </span>
                      </div>
                      <p className="text-foreground mt-2 whitespace-pre-wrap text-sm">
                        {action.proposed_content}
                      </p>
                      {action.rationale ? (
                        <p className="text-muted-foreground mt-2 text-xs">{action.rationale}</p>
                      ) : null}
                      {action.status === 'proposed' ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void reviewAction(action.id, 'approved')
                                .then(() => toast.success(SLACK_PEOPLE_MESSAGES.REVIEW_APPROVED))
                                .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.REVIEW_ERROR))
                            }}
                            className="button-glass-primary rounded-lg px-3 py-2 text-xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void reviewAction(action.id, 'dismissed')
                                .then(() => toast.success(SLACK_PEOPLE_MESSAGES.REVIEW_DISMISSED))
                                .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.REVIEW_ERROR))
                            }}
                            className="button-glass-secondary rounded-lg px-3 py-2 text-xs"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : null}
                      {action.status === 'approved' ? (
                        peopleById.get(action.target_member_id ?? '')?.delivery_mode ===
                        'active' ? (
                          <button
                            type="button"
                            onClick={() => {
                              void sendAction(action.id)
                                .then(() => toast.success(SLACK_PEOPLE_MESSAGES.SEND_SUCCESS))
                                .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.SEND_ERROR))
                            }}
                            className="button-glass-primary mt-3 rounded-lg px-3 py-2 text-xs"
                          >
                            Send now
                          </button>
                        ) : (
                          <p className="text-muted-foreground mt-3 text-xs">
                            {SLACK_PEOPLE_MESSAGES.ACTIVE_REQUIRED}
                          </p>
                        )
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="surface-card border-border overflow-hidden rounded-2xl border">
              <div className="border-border border-b p-4">
                <h2 className="text-foreground text-sm font-semibold">Slack people</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  Shadow is the default. Proposals need approval, and sending stays locked until you
                  explicitly set the person to Active.
                </p>
              </div>
              <div className="divide-border divide-y">
                {people.map((person) => (
                  <div key={person.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="bg-secondary text-secondary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {initials(person.display_name) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium">
                        {person.display_name}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {relationshipLabel(person)}
                        {person.title ? ` · ${person.title}` : ''}
                      </p>
                    </div>
                    <div className="bg-secondary flex rounded-lg p-1" aria-label="Delivery mode">
                      {(Object.keys(MODE_LABELS) as SlackDeliveryMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            void updateDeliveryMode(person.id, mode).catch(() =>
                              toast.error(SLACK_PEOPLE_MESSAGES.MODE_ERROR),
                            )
                          }}
                          className={cn(
                            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
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
                      disabled={person.delivery_mode === 'off'}
                      aria-label={`Create test proposal for ${person.display_name}`}
                      onClick={() => {
                        void createAndRevealTestProposal(person.id)
                      }}
                      className="button-glass-secondary rounded-lg px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create test proposal
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
