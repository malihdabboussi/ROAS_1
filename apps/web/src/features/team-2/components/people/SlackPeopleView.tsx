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
import { SlackChannelsView } from './SlackChannelsView'
import { SlackPeopleRoster } from './SlackPeopleRoster'
import { SlackPeopleViewsNav, type SlackPeopleViewKey } from './SlackPeopleViewsNav'
import { SlackPersonScreen } from './SlackPersonScreen'
import { SlackShadowConversationView } from './SlackShadowConversationView'
import { SlackShadowSummary } from './SlackShadowSummary'
import { SlackTeamSignalsView } from './SlackTeamSignalsView'

export function SlackPeopleView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPersonId = searchParams.get('person')
  const showShadowInbox = searchParams.get('peopleView') === 'shadow'
  const showChannels = searchParams.get('peopleView') === 'channels'
  const showSignals = searchParams.get('peopleView') === 'signals'
  const selectedSignalId = searchParams.get('signal')
  const selectedChannelId = searchParams.get('slackChannel')
  const [activity, setActivity] = useState<SlackPersonActivity | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const {
    connected,
    people,
    portalUsers,
    actions,
    loading,
    error,
    updateDeliveryMode,
    updateRelationshipKind,
    confirmSuggestedIdentity,
    mapIdentity,
    createPersonBrain,
    loadPersonActivity,
    createProposal,
    reviewAction,
    sendAction,
    trainSignal,
    refresh,
  } = useSlackPeople()
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const selectedPerson = selectedPersonId ? (peopleById.get(selectedPersonId) ?? null) : null
  const selectedActions = selectedPersonId
    ? actions.filter((action) => action.target_member_id === selectedPersonId)
    : []

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
  const openChannels = () =>
    router.push('/team?section=people&peopleView=channels', { scroll: false })
  const openChannel = (channelId: string) =>
    router.push(
      `/team?section=people&peopleView=channels&slackChannel=${encodeURIComponent(channelId)}`,
      { scroll: false },
    )
  const openSignals = () =>
    router.push('/team?section=people&peopleView=signals', { scroll: false })
  const openSignal = (signalId: string) =>
    router.push(`/team?section=people&peopleView=signals&signal=${encodeURIComponent(signalId)}`, {
      scroll: false,
    })
  const activeView: SlackPeopleViewKey = showChannels
    ? 'channels'
    : showSignals
      ? 'signals'
      : showShadowInbox
        ? 'shadow'
        : 'people'
  const openView = (view: SlackPeopleViewKey) => {
    if (view === 'channels') openChannels()
    else if (view === 'signals') openSignals()
    else if (view === 'shadow') openShadowInbox()
    else openPeople()
  }

  const classifyPerson = (id: string, kind: SlackRelationshipKind) => {
    void updateRelationshipKind(id, kind).catch(() =>
      toast.error(SLACK_PEOPLE_MESSAGES.CLASSIFICATION_ERROR),
    )
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
    <div
      className={
        selectedPersonId
          ? 'p-spacing-3 flex min-h-0 flex-1 flex-col overflow-hidden'
          : 'p-spacing-6 flex min-h-0 flex-1 flex-col overflow-y-auto'
      }
    >
      <div
        className={
          selectedPersonId
            ? 'flex min-h-0 w-full flex-1 flex-col'
            : 'gap-spacing-6 mx-auto flex w-full max-w-6xl flex-col'
        }
      >
        {!selectedPersonId && !showShadowInbox && !showChannels && !showSignals ? (
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
              onClick={() =>
                void refresh()
                  .then(() => toast.success(SLACK_PEOPLE_MESSAGES.REFRESH_SUCCESS))
                  .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.REFRESH_ERROR))
              }
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

        {!selectedPersonId ? <SlackPeopleViewsNav active={activeView} onChange={openView} /> : null}

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
                  portalUsers={portalUsers}
                  activity={activity}
                  actions={selectedActions}
                  loading={activityLoading}
                  onBack={openPeople}
                  onCreateProposal={async (content) => {
                    try {
                      await createProposal(selectedPerson.id, content)
                      toast.success(SLACK_PEOPLE_MESSAGES.PROPOSAL_CREATED)
                      return true
                    } catch {
                      toast.error(SLACK_PEOPLE_MESSAGES.PROPOSAL_ERROR)
                      return false
                    }
                  }}
                  onReview={reviewActionWithToast}
                  onSend={sendActionWithToast}
                  onUpdateDeliveryMode={(mode) => {
                    void updateDeliveryMode(selectedPerson.id, mode).catch(() =>
                      toast.error(SLACK_PEOPLE_MESSAGES.MODE_ERROR),
                    )
                  }}
                  onUpdateRelationshipKind={(kind) => classifyPerson(selectedPerson.id, kind)}
                  onConfirmIdentity={() => {
                    void confirmSuggestedIdentity(selectedPerson.id)
                      .then(() => toast.success(SLACK_PEOPLE_MESSAGES.IDENTITY_CONFIRMED))
                      .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.IDENTITY_CONFIRM_ERROR))
                  }}
                  onMapIdentity={async (userId) => {
                    try {
                      await mapIdentity(selectedPerson.id, userId)
                      toast.success(SLACK_PEOPLE_MESSAGES.IDENTITY_MAPPED)
                    } catch {
                      toast.error(SLACK_PEOPLE_MESSAGES.IDENTITY_MAP_ERROR)
                    }
                  }}
                  onCreateBrain={async () => {
                    try {
                      await createPersonBrain(selectedPerson.id)
                      toast.success(SLACK_PEOPLE_MESSAGES.BRAIN_CREATED)
                    } catch {
                      toast.error(SLACK_PEOPLE_MESSAGES.BRAIN_CREATE_ERROR)
                    }
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
            ) : showChannels ? (
              <SlackChannelsView
                selectedChannelId={selectedChannelId}
                onSelectChannel={openChannel}
                onBack={openChannels}
              />
            ) : showSignals ? (
              <SlackTeamSignalsView
                actions={actions}
                selectedSignalId={selectedSignalId}
                onBack={openPeople}
                onSelectSignal={openSignal}
                onReview={reviewActionWithToast}
                onSend={sendActionWithToast}
                onTrain={(signalId, instruction, saveAsRule) => {
                  void trainSignal(signalId, instruction, saveAsRule)
                    .then(() => toast.success(SLACK_PEOPLE_MESSAGES.SIGNAL_TRAIN_SUCCESS))
                    .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.SIGNAL_TRAIN_ERROR))
                }}
              />
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

                <SlackShadowSummary
                  actions={actions}
                  peopleById={peopleById}
                  onOpen={openShadowInbox}
                />

                <SlackPeopleRoster
                  people={people}
                  portalUsers={portalUsers}
                  onOpenPerson={openPerson}
                  onUpdateRelationshipKind={(person, kind) => classifyPerson(person.id, kind)}
                  onUpdateDeliveryMode={(person, mode) => {
                    void updateDeliveryMode(person.id, mode).catch(() =>
                      toast.error(SLACK_PEOPLE_MESSAGES.MODE_ERROR),
                    )
                  }}
                  onConfirmIdentity={(person) => {
                    void confirmSuggestedIdentity(person.id)
                      .then(() => toast.success(SLACK_PEOPLE_MESSAGES.IDENTITY_CONFIRMED))
                      .catch(() => toast.error(SLACK_PEOPLE_MESSAGES.IDENTITY_CONFIRM_ERROR))
                  }}
                  onMapIdentity={async (person, userId) => {
                    try {
                      await mapIdentity(person.id, userId)
                      toast.success(SLACK_PEOPLE_MESSAGES.IDENTITY_MAPPED)
                    } catch {
                      toast.error(SLACK_PEOPLE_MESSAGES.IDENTITY_MAP_ERROR)
                    }
                  }}
                  onCreateBrain={async (person) => {
                    try {
                      await createPersonBrain(person.id)
                      toast.success(SLACK_PEOPLE_MESSAGES.BRAIN_CREATED)
                    } catch {
                      toast.error(SLACK_PEOPLE_MESSAGES.BRAIN_CREATE_ERROR)
                    }
                  }}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
