'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
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
import { SlackPersonScreen } from './SlackPersonScreen'
import { SlackShadowConversationView } from './SlackShadowConversationView'
import { SlackShadowSummary } from './SlackShadowSummary'

export function SlackPeopleView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPersonId = searchParams.get('person')
  const showShadowInbox = searchParams.get('peopleView') === 'shadow'
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

  useEffect(() => {
    if (!selectedPersonId || !selectedPerson) return

    let cancelled = false
    setActivity(null)
    setActivityLoading(true)
    void loadPersonActivity(selectedPersonId)
      .then((result) => {
        if (!cancelled) setActivity(result)
      })
      .catch(() => {
        if (!cancelled) toast.error(SLACK_PEOPLE_MESSAGES.ACTIVITY_ERROR)
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [loadPersonActivity, selectedPerson, selectedPersonId])

  const openPerson = (person: SlackDiscoveredPerson) => {
    router.push(`/team?section=people&person=${encodeURIComponent(person.id)}`, { scroll: false })
  }

  const openPeople = () => router.push('/team?section=people', { scroll: false })
  const openShadowInbox = () =>
    router.push('/team?section=people&peopleView=shadow', { scroll: false })

  const classifyPerson = (id: string, kind: SlackRelationshipKind) => {
    void updateRelationshipKind(id, kind).catch(() =>
      toast.error(SLACK_PEOPLE_MESSAGES.CLASSIFICATION_ERROR),
    )
  }

  const createAndRevealTestProposal = async (personId: string) => {
    try {
      await createTestProposal(personId)
      toast.success(SLACK_PEOPLE_MESSAGES.TEST_PROPOSAL_CREATED)
      openShadowInbox()
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
  const deliveryStats = [
    { label: 'Shadow', value: people.filter((person) => person.delivery_mode === 'shadow').length },
    { label: 'Active', value: people.filter((person) => person.delivery_mode === 'active').length },
    { label: 'Off', value: people.filter((person) => person.delivery_mode === 'off').length },
  ]

  const reviewActionWithToast = (id: string, status: 'approved' | 'dismissed') => {
    void reviewAction(id, status)
      .then(() =>
        toast.success(
          status === 'approved'
            ? SLACK_PEOPLE_MESSAGES.REVIEW_APPROVED
            : SLACK_PEOPLE_MESSAGES.REVIEW_DISMISSED,
        ),
      )
      .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.REVIEW_ERROR))
  }

  const sendActionWithToast = (id: string) => {
    void sendAction(id)
      .then(() => toast.success(SLACK_PEOPLE_MESSAGES.SEND_SUCCESS))
      .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.SEND_ERROR))
  }

  return (
    <div className="p-spacing-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="gap-spacing-6 mx-auto flex w-full max-w-6xl flex-col">
        {!selectedPersonId && !showShadowInbox ? (
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
        ) : null}

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
            {selectedPersonId ? (
              selectedPerson ? (
                <SlackPersonScreen
                  person={selectedPerson}
                  activity={activity}
                  loading={activityLoading}
                  onBack={openPeople}
                  onConfirmIdentity={() => {
                    void confirmSuggestedIdentity(selectedPerson.id)
                      .then(() => toast.success(SLACK_PEOPLE_MESSAGES.IDENTITY_CONFIRMED))
                      .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.IDENTITY_CONFIRM_ERROR))
                  }}
                />
              ) : (
                <section className="surface-card border-border p-spacing-6 rounded-spacing-4 border">
                  <p className="body-2 text-foreground font-medium">
                    {SLACK_PEOPLE_MESSAGES.PERSON_NOT_FOUND}
                  </p>
                  <button
                    type="button"
                    onClick={openPeople}
                    className="button-compact button-glass-neutral mt-spacing-4"
                  >
                    Back to People
                  </button>
                </section>
              )
            ) : showShadowInbox ? (
              <SlackShadowConversationView
                actions={actions}
                peopleById={peopleById}
                onBack={openPeople}
                onOpenPerson={openPerson}
                onReview={reviewActionWithToast}
                onSend={sendActionWithToast}
              />
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
                  <div className="gap-spacing-4 flex flex-wrap items-start justify-between">
                    <div>
                      <h2 className="body-2 text-foreground font-semibold">
                        Current delivery modes
                      </h2>
                      <p className="body-4 text-muted-foreground mt-spacing-1">
                        Shadow is the safe default. Active and Off are explicit exceptions that
                        remain saved per person.
                      </p>
                    </div>
                    <div className="gap-spacing-2 flex flex-wrap">
                      {deliveryStats.map((stat) => (
                        <span key={stat.label} className="badge-glass badge-glass-muted body-4">
                          {stat.value} {stat.label}
                        </span>
                      ))}
                    </div>
                  </div>
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

                <SlackShadowSummary
                  actions={actions}
                  peopleById={peopleById}
                  onOpen={openShadowInbox}
                />

                <SlackPeopleRoster
                  people={people}
                  onOpenPerson={openPerson}
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
          </>
        )}
      </div>
    </div>
  )
}
