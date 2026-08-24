'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bot, MessageSquare } from 'lucide-react'
import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import { useShellStore } from '@/components/shell/use-shell-store'
import {
  fetchConversations,
  formatCompactRelativeTime,
  getConversationDisplayTitle,
  type Conversation,
} from '@/lib/conversations'
import type { Mission } from '@/lib/missions'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

export function AgencyClientChatsMissionsPanel({
  campaignId,
  missions,
  onMissionsChanged,
}: {
  campaignId: string
  missions: Mission[]
  onMissionsChanged: () => void
}) {
  const openChatDrawer = useShellStore((state) => state.openChatDrawer)
  const setWorkAreaOpen = useShellStore((state) => state.setWorkAreaOpen)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    void fetchConversations(campaignId)
      .then((rows) => {
        if (!cancelled) setConversations(rows)
      })
      .catch(() => {
        if (!cancelled) {
          setConversations([])
          setError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  const campaignMissions = useMemo(
    () =>
      missions
        .filter((mission) => mission.campaign_id === campaignId && !mission.parent_mission_id)
        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)),
    [campaignId, missions],
  )

  const openConversation = (conversationId: string) => {
    openChatDrawer(conversationId)
    setWorkAreaOpen(true)
  }

  return (
    <div className="gap-spacing-4 grid lg:grid-cols-2">
      <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
        <div className="gap-spacing-2 flex items-center">
          <MessageSquare className="icon-sm text-muted-foreground" aria-hidden />
          <h2 className="body-2 text-foreground font-semibold">Chats</h2>
        </div>
        <div className="mt-spacing-4 gap-spacing-2 flex flex-col">
          {loading ? (
            <p className="body-3 text-muted-foreground">
              {AGENCY_CLIENT_MESSAGES.LOADING_CLIENT_COMMUNICATIONS}
            </p>
          ) : error ? (
            <p className="body-3 text-destructive">
              {AGENCY_CLIENT_MESSAGES.LOAD_CLIENT_COMMUNICATIONS_ERROR}
            </p>
          ) : conversations.length === 0 ? (
            <p className="body-3 text-muted-foreground">{AGENCY_CLIENT_MESSAGES.NO_CLIENT_CHATS}</p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => openConversation(conversation.id)}
                className="rounded-spacing-2 border-border hover:bg-hover-subtle gap-spacing-3 px-spacing-3 py-spacing-2 flex w-full items-center border text-left"
              >
                <MessageSquare className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="body-3 text-foreground block truncate font-medium">
                    {conversationTitle(conversation)}
                  </span>
                  {conversationPreview(conversation.last_message) ? (
                    <span className="body-4 text-muted-foreground mt-spacing-1 block truncate">
                      {conversationPreview(conversation.last_message)}
                    </span>
                  ) : null}
                </span>
                <span className="body-4 text-muted-foreground shrink-0">
                  {formatCompactRelativeTime(
                    conversation.last_message_at ?? conversation.updated_at,
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
        <div className="gap-spacing-2 flex items-center">
          <Bot className="icon-sm text-muted-foreground" aria-hidden />
          <h2 className="body-2 text-foreground font-semibold">Missions</h2>
        </div>
        <div className="mt-spacing-4 gap-spacing-2 flex flex-col">
          {campaignMissions.length === 0 ? (
            <p className="body-3 text-muted-foreground">
              {AGENCY_CLIENT_MESSAGES.NO_CLIENT_MISSIONS}
            </p>
          ) : (
            campaignMissions.map((mission) => (
              <button
                key={mission.id}
                type="button"
                onClick={() => setSelectedMission(mission)}
                className="rounded-spacing-2 border-border hover:bg-hover-subtle gap-spacing-3 px-spacing-3 py-spacing-2 flex w-full items-center border text-left"
              >
                <Bot className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                <span className="body-3 text-foreground min-w-0 flex-1 truncate font-medium">
                  {mission.title}
                </span>
                <span className="body-4 text-muted-foreground shrink-0 capitalize">
                  {mission.status.replaceAll('_', ' ')}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      {selectedMission ? (
        <MissionDetailModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
          onUpdated={() => {
            onMissionsChanged()
            setSelectedMission(null)
          }}
        />
      ) : null}
    </div>
  )
}

function conversationTitle(conversation: Conversation) {
  const title = getConversationDisplayTitle(conversation)
  if (!title || /^(?::[a-z0-9_+-]+:)+$/i.test(title)) return 'Client conversation'
  return title
}

function conversationPreview(value: string | null | undefined) {
  const preview = (value ?? '')
    .replace(/:[a-z0-9_+-]+:/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return preview || null
}
