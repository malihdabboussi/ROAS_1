'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { QuickMissionsHubModal } from '@/features/spaces/components/playbooks/QuickMissionsHubModal'
import { QUICK_MISSIONS_MESSAGES } from '@/features/spaces/config/quick-missions-messages.config'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { createNewConversation, persistQuickMissionReceipt } from '@/lib/conversations'
import { useClientScope } from '@/lib/client-scope'
import { useQuickMissionsLauncher } from '@/lib/missions'
import { useGlobalChatStore } from '../store/use-global-chat-store'

type QuickMissionClient = {
  spaceId: string
  campaignId: string
  title: string
}

export function resolveQuickMissionSourceConversationId({
  pathname,
  routeConversationId,
  activeConversationId,
}: {
  pathname: string
  routeConversationId?: string | null
  activeConversationId?: string | null
}): string | null {
  return pathname === '/home' ? (routeConversationId ?? null) : (activeConversationId ?? null)
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

export function QuickMissionsHubHost({
  open: controlledOpen,
  initialPlaybookKey: controlledPlaybookKey,
  onClose: controlledOnClose,
}: {
  open?: boolean
  initialPlaybookKey?: string | null
  onClose?: () => void
} = {}) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const loadSpaces = useSpacesStore((s) => s.loadSpaces)
  const workContext = useGlobalChatStore((s) => s.workContext)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const sourceConversationId = resolveQuickMissionSourceConversationId({
    pathname,
    routeConversationId: searchParams.get('conv'),
    activeConversationId,
  })
  const conversationCampaignId = useChatStore((s) => {
    return sourceConversationId
      ? s.conversations.find((conversation) => conversation.id === sourceConversationId)
          ?.campaign_id
      : null
  })
  const addMessage = useChatStore((s) => s.addMessage)
  const addConversation = useChatStore((s) => s.addConversation)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const { scope: clientScope } = useClientScope()
  const launcher = useQuickMissionsLauncher()
  const open = controlledOpen ?? launcher.open
  const initialPlaybookKey = controlledPlaybookKey ?? launcher.playbookKey
  const parentMissionId = launcher.parentMissionId

  useEffect(() => {
    void loadSpaces()
  }, [loadSpaces])

  const clients = useMemo(
    () =>
      spaces
        .filter(
          (space) =>
            typeof space.campaign_id === 'string' &&
            space.campaign_id.length > 0 &&
            space.space_kind !== 'personal_dashboard' &&
            (launcher.spaceId || parentMissionId || !clientScope
              ? true
              : space.campaign_id === clientScope.campaignId ||
                clientScope.spaceIds.includes(space.id)),
        )
        .map((space) => ({
          spaceId: space.id,
          campaignId: space.campaign_id as string,
          title: space.title,
        })),
    [clientScope, launcher.spaceId, parentMissionId, spaces],
  )
  const clientScopeSpaceId = clientScope?.spaceIds.find((spaceId) =>
    clients.some((client) => client.spaceId === spaceId),
  )
  const initialClientSpaceId = useMemo(
    () =>
      resolveQuickMissionDefaultSpaceId({
        clients,
        contextSpaceId:
          launcher.spaceId ?? (clientScope ? clientScopeSpaceId : workContext.spaceId),
        contextCampaignId: clientScope?.campaignId ?? workContext.campaignId,
        conversationCampaignId,
        activeSpaceId,
      }),
    [
      activeSpaceId,
      clients,
      clientScope,
      clientScopeSpaceId,
      conversationCampaignId,
      launcher.spaceId,
      workContext.campaignId,
      workContext.spaceId,
    ],
  )

  return (
    <QuickMissionsHubModal
      open={open}
      clients={clients}
      initialPlaybookKey={initialPlaybookKey}
      initialClientSpaceId={initialClientSpaceId}
      parentMissionId={parentMissionId}
      sourceConversationId={sourceConversationId}
      onResolveSourceConversation={async ({ missionTitle, campaignId, spaceId }) => {
        if (sourceConversationId) return sourceConversationId
        if (parentMissionId) return null
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
      onStarted={async (missionId, missionTitle, spaceId, startedSourceConversationId) => {
        const receiptConversationId = startedSourceConversationId ?? sourceConversationId
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
        if (controlledOpen === undefined) launcher.closeLauncher()
        controlledOnClose?.()
      }}
    />
  )
}
