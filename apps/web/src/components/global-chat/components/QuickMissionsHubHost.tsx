'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { QuickMissionsHubModal } from '@/features/spaces/components/playbooks/QuickMissionsHubModal'
import { QUICK_MISSIONS_MESSAGES } from '@/features/spaces/config/quick-missions-messages.config'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { createNewConversation, persistQuickMissionReceipt } from '@/lib/conversations'
import { QUICK_MISSIONS_OPEN_EVENT } from '@/lib/missions'
import { useGlobalChatStore } from '../store/use-global-chat-store'

type QuickMissionClient = {
  spaceId: string
  campaignId: string
  title: string
}

export function resolveQuickMissionDefaultSpaceId({
  clients,
  contextSpaceId,
  contextCampaignId,
  conversationCampaignId,
  activeSpaceId,
}: {
  clients: QuickMissionClient[]
  contextSpaceId?: string | null
  contextCampaignId?: string | null
  conversationCampaignId?: string | null
  activeSpaceId?: string | null
}): string | null {
  if (contextSpaceId && clients.some((client) => client.spaceId === contextSpaceId)) {
    return contextSpaceId
  }
  const campaignId = contextCampaignId ?? conversationCampaignId
  const campaignSpaceId = clients.find((client) => client.campaignId === campaignId)?.spaceId
  if (campaignSpaceId) return campaignSpaceId
  return clients.some((client) => client.spaceId === activeSpaceId) ? (activeSpaceId ?? null) : null
}

export function buildQuickMissionReceipt(
  missionId: string,
  missionTitle: string,
  conversationId: string,
  spaceId?: string,
) {
  const content = QUICK_MISSIONS_MESSAGES.startedReceipt(missionTitle)
  return {
    id: missionId,
    conversation_id: conversationId,
    role: 'assistant' as const,
    content,
    content_blocks: null,
    metadata: {
      quick_mission_receipt: true,
      mission_id: missionId,
      content_blocks_ordered: [
        { type: 'text', id: `quick-mission-text-${missionId}`, content },
        {
          type: 'artifact_preview',
          id: `quick-mission-card-${missionId}`,
          artifactType: 'mission',
          artifactId: missionId,
          ...(spaceId ? { spaceId } : {}),
          name: missionTitle,
          subtitle: 'Started from this chat',
          status: 'Started',
        },
      ],
    },
    created_at: new Date().toISOString(),
  }
}

export function QuickMissionsHubHost() {
  const router = useRouter()
  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const loadSpaces = useSpacesStore((s) => s.loadSpaces)
  const workContext = useGlobalChatStore((s) => s.workContext)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const conversationCampaignId = useChatStore((s) => {
    const active = s.activeConversationId
    return active
      ? s.conversations.find((conversation) => conversation.id === active)?.campaign_id
      : null
  })
  const addMessage = useChatStore((s) => s.addMessage)
  const addConversation = useChatStore((s) => s.addConversation)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const [open, setOpen] = useState(false)
  const [initialPlaybookKey, setInitialPlaybookKey] = useState<string | null>(null)

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ playbookKey?: string | null }>).detail
      setInitialPlaybookKey(detail?.playbookKey ?? null)
      setOpen(true)
    }
    window.addEventListener(QUICK_MISSIONS_OPEN_EVENT, onOpen as EventListener)
    return () => window.removeEventListener(QUICK_MISSIONS_OPEN_EVENT, onOpen as EventListener)
  }, [])

  useEffect(() => {
    if (open) void loadSpaces()
  }, [loadSpaces, open])

  const clients = useMemo(
    () =>
      spaces
        .filter(
          (space) =>
            typeof space.campaign_id === 'string' &&
            space.campaign_id.length > 0 &&
            space.space_kind !== 'personal_dashboard',
        )
        .map((space) => ({
          spaceId: space.id,
          campaignId: space.campaign_id as string,
          title: space.title,
        })),
    [spaces],
  )
  const initialClientSpaceId = useMemo(
    () =>
      resolveQuickMissionDefaultSpaceId({
        clients,
        contextSpaceId: workContext.spaceId,
        contextCampaignId: workContext.campaignId,
        conversationCampaignId,
        activeSpaceId,
      }),
    [activeSpaceId, clients, conversationCampaignId, workContext.campaignId, workContext.spaceId],
  )

  return (
    <QuickMissionsHubModal
      open={open}
      clients={clients}
      initialPlaybookKey={initialPlaybookKey}
      initialClientSpaceId={initialClientSpaceId}
      sourceConversationId={activeConversationId}
      onResolveSourceConversation={async ({ missionTitle, campaignId, spaceId }) => {
        const currentConversationId = useChatStore.getState().activeConversationId
        if (currentConversationId) return currentConversationId
        const conversation = await createNewConversation({
          title: missionTitle,
          campaign_id: campaignId,
          metadata: { space_id: spaceId },
        })
        addConversation(conversation)
        setActiveConversationId(conversation.id)
        router.push(`/home?conv=${encodeURIComponent(conversation.id)}`)
        return conversation.id
      }}
      onStarted={async (missionId, missionTitle, spaceId, sourceConversationId) => {
        const receiptConversationId = sourceConversationId ?? activeConversationId
        if (!receiptConversationId) return
        try {
          const persistedReceipt = await persistQuickMissionReceipt(receiptConversationId, {
            mission_id: missionId,
            mission_title: missionTitle,
            space_id: spaceId,
          })
          addMessage(receiptConversationId, {
            ...buildQuickMissionReceipt(missionId, missionTitle, receiptConversationId, spaceId),
            id: persistedReceipt.id,
            created_at: persistedReceipt.created_at,
          })
        } catch (error) {
          addMessage(
            receiptConversationId,
            buildQuickMissionReceipt(missionId, missionTitle, receiptConversationId, spaceId),
          )
          throw error
        }
      }}
      onClose={() => {
        setOpen(false)
        setInitialPlaybookKey(null)
      }}
    />
  )
}
