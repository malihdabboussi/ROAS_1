'use client'

import { useRef, useState } from 'react'
import { CircleUserRound, RefreshCw, UserRoundCheck, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { SLACK_PEOPLE_MESSAGES } from '../../config/messages.config'
import { useSlackPeople } from '../../hooks/use-slack-people'
import type {
  SlackDiscoveredPerson,
  SlackPersonActivity,
  SlackRelationshipKind,
} from '../../services/slack-people.service'
import { SlackPeopleRoster } from './SlackPeopleRoster'
import { SlackPersonDetail } from './SlackPersonDetail'
import { SlackShadowInbox } from './SlackShadowInbox'

export function SlackPeopleView() {
  const shadowInboxRef = useRef<HTMLDivElement>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [activity, setActivity] = useState<SlackPersonActivity | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const {
    connected,
    people,
    actions,
    loading,
    error,
    updateDeliveryMode,
    updateRelationshipKind,
    confirmSuggestedIdentity,
    loadPersonActivity,
    createTestProposal,
    reviewAction,
    sendAction,
    reload,
  } = useSlackPeople()
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const selectedPerson = selectedPersonId ? (peopleById.get(selectedPersonId) ?? null) : null

  const openPerson = async (person: SlackDiscoveredPerson) => {
    setSelectedPersonId(person.id)
    setActivity(null)
    setActivityLoading(true)
    try {
      setActivity(await loadPersonActivity(person.id))
    } catch {
      toast.error(SLACK_PEOPLE_MESSAGES.ACTIVITY_ERROR)
    } finally {
      setActivityLoading(false)
    }
  }

  const classifyPerson = (id: string, kind: SlackRelationshipKind) => {
    void updateRelationshipKind(id, kind).catch(() =>
      toast.error(SLACK_PEOPLE_MESSAGES.CLASSIFICATION_ERROR),
    )
  }

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

  const stats = [
    { label: 'Active Slack people', value: people.length, icon: UsersRound },
    {
      label: 'Portal users',
      value: people.filter((person) => person.vibey_user_id).length,
      icon: UserRoundCheck,
    },
    {
      label: 'Slack-only people',
      value: people.filter((person) => !person.vibey_user_id).length,
      icon: CircleUserRound,
    },
  ]

  return (
    <div className="p-spacing-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="gap-spacing-6 mx-auto flex w-full max-w-6xl flex-col">
        <header className="gap-spacing-4 flex flex-wrap items-start justify-between">
          <div>
            <p className="eyebrow text-muted-foreground">Managed team intelligence</p>
            <h1 className="title-h4 text-foreground mt-spacing-1">PEOPLE & SHADOW MODE</h1>
            <p className="body-3 text-muted-foreground mt-spacing-2 max-w-2xl">
              Classify active Slack people, connect portal identities and User Brains, then review
              every proposed message before it can reach Slack.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="button-compact button-glass-neutral"
          >
            <RefreshCw className="icon-xs" /> Refresh Slack
          </button>
        </header>

        {error ? (
          <div className="border-destructive text-destructive p-spacing-4 rounded-spacing-3 body-3 border">
            {SLACK_PEOPLE_MESSAGES.LOAD_ERROR}
          </div>
        ) : null}

        {!connected ? (
          <div className="surface-card border-border p-spacing-6 rounded-spacing-4 border">
            <p className="body-2 text-foreground font-medium">Slack is not connected</p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {SLACK_PEOPLE_MESSAGES.DISCONNECTED}
            </p>
          </div>
        ) : (
          <>
            <section className="gap-spacing-3 grid sm:grid-cols-3">
              {stats.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="surface-card border-border p-spacing-4 rounded-spacing-3 border"
                >
                  <div className="body-4 text-muted-foreground gap-spacing-2 flex items-center font-medium">
                    <Icon className="icon-sm" /> {label}
                  </div>
                  <p className="title-h4 text-foreground mt-spacing-3 tabular-nums">{value}</p>
                </div>
              ))}
            </section>

            <section className="surface-card border-border p-spacing-4 rounded-spacing-4 border">
              <h2 className="body-2 text-foreground font-semibold">How Shadow mode works</h2>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                {SLACK_PEOPLE_MESSAGES.CURRENT_CAPABILITY}
              </p>
              <div className="mt-spacing-4 gap-spacing-3 grid sm:grid-cols-3">
                {SLACK_PEOPLE_MESSAGES.HOW_IT_WORKS.map((step) => (
                  <div key={step.title} className="bg-secondary p-spacing-3 rounded-spacing-3">
                    <p className="body-4 text-foreground font-semibold">{step.title}</p>
                    <p className="body-4 text-muted-foreground mt-spacing-1">{step.body}</p>
                  </div>
                ))}
              </div>
              <p className="body-4 text-muted-foreground mt-spacing-3">
                {SLACK_PEOPLE_MESSAGES.GHOST_PROFILE_HELP}
              </p>
            </section>

            {selectedPerson ? (
              <SlackPersonDetail
                person={selectedPerson}
                activity={activity}
                loading={activityLoading}
                onClose={() => setSelectedPersonId(null)}
                onConfirmIdentity={() => {
                  void confirmSuggestedIdentity(selectedPerson.id)
                    .then(() => toast.success(SLACK_PEOPLE_MESSAGES.IDENTITY_CONFIRMED))
                    .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.IDENTITY_CONFIRM_ERROR))
                }}
              />
            ) : null}

            <div ref={shadowInboxRef}>
              <SlackShadowInbox
                actions={actions}
                peopleById={peopleById}
                onOpenPerson={(person) => void openPerson(person)}
                onReview={(id, status) => {
                  void reviewAction(id, status)
                    .then(() =>
                      toast.success(
                        status === 'approved'
                          ? SLACK_PEOPLE_MESSAGES.REVIEW_APPROVED
                          : SLACK_PEOPLE_MESSAGES.REVIEW_DISMISSED,
                      ),
                    )
                    .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.REVIEW_ERROR))
                }}
                onSend={(id) => {
                  void sendAction(id)
                    .then(() => toast.success(SLACK_PEOPLE_MESSAGES.SEND_SUCCESS))
                    .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.SEND_ERROR))
                }}
              />
            </div>

            <SlackPeopleRoster
              people={people}
              onOpenPerson={(person) => void openPerson(person)}
              onUpdateDeliveryMode={(id, mode) => {
                void updateDeliveryMode(id, mode).catch(() =>
                  toast.error(SLACK_PEOPLE_MESSAGES.MODE_ERROR),
                )
              }}
              onUpdateRelationshipKind={classifyPerson}
              onCreateTestProposal={(id) => void createAndRevealTestProposal(id)}
            />
          </>
        )}
      </div>
    </div>
  )
}
