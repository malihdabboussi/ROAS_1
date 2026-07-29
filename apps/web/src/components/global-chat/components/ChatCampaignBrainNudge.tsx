'use client'

import { useMemo, useState } from 'react'
import { BrainCircuit, ChevronRight, X } from 'lucide-react'
import { useShellStore } from '@/components/shell/use-shell-store'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useActiveMessages, useChatStore } from '@/features/studio/store/use-chat-store'
import {
  CAMPAIGN_BRAIN_NUDGE_MESSAGES,
  CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS,
  countUserMessageTurns,
  shouldOfferCampaignBrainNudge,
} from '../config/work-context.config'
import {
  addCampaignBrainNudgeDismissedConversationId,
  readCampaignBrainNudgeDismissedConversationIds,
} from '../lib/global-chat-storage'
import { useGlobalChatStore } from '../store/use-global-chat-store'

export function ChatCampaignBrainNudge() {
  const workContext = useGlobalChatStore((state) => state.workContext)
  const activeConversationId = useChatStore((state) => state.activeConversationId)
  const activeConversation = useChatStore((state) =>
    state.conversations.find((conversation) => conversation.id === state.activeConversationId),
  )
  const messages = useActiveMessages()
  const spaces = useSpacesStore((state) => state.spaces)
  const requestConversationScopePicker = useShellStore(
    (state) => state.requestConversationScopePicker,
  )
  const [dismissedIds, setDismissedIds] = useState(() =>
    readCampaignBrainNudgeDismissedConversationIds(),
  )

  const userTurnCount = useMemo(() => countUserMessageTurns(messages), [messages])
  const clientCampaignIds = useMemo(
    () =>
      new Set(
        spaces
          .filter((space) => space.space_kind !== 'personal_dashboard')
          .map((space) => space.campaign_id)
          .filter((campaignId): campaignId is string => Boolean(campaignId)),
      ),
    [spaces],
  )
  const persistedSpaceId =
    typeof activeConversation?.metadata?.space_id === 'string'
      ? activeConversation.metadata.space_id
      : null
  const persistedClientCampaignId =
    activeConversation?.campaign_id && clientCampaignIds.has(activeConversation.campaign_id)
      ? activeConversation.campaign_id
      : null
  const dismissed =
    Boolean(activeConversationId) && dismissedIds.includes(activeConversationId ?? '')
  const eligible = shouldOfferCampaignBrainNudge({
    surface: workContext.surface,
    campaignId: workContext.campaignId ?? persistedClientCampaignId,
    spaceId: workContext.spaceId ?? persistedSpaceId,
    userTurnCount,
    minUserTurns: CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS,
    dismissed,
  })

  if (!eligible || !activeConversationId || activeConversationId.startsWith('pending-')) {
    return null
  }

  const handleDismiss = () => {
    setDismissedIds(addCampaignBrainNudgeDismissedConversationId(activeConversationId))
  }

  return (
    <div className="chat-surface-rec-banner mx-spacing-2 mb-spacing-2 gap-spacing-1 flex shrink-0 items-center">
      <button
        type="button"
        className="hover:bg-hover-subtle gap-spacing-2 p-spacing-1 flex min-w-0 flex-1 items-center rounded-lg text-left transition-colors"
        aria-label={CAMPAIGN_BRAIN_NUDGE_MESSAGES.actionLabel}
        onClick={requestConversationScopePicker}
      >
        <BrainCircuit className="icon-sm text-primary shrink-0" aria-hidden />
        <span className="body-4 text-foreground min-w-0 flex-1">
          {CAMPAIGN_BRAIN_NUDGE_MESSAGES.prompt}
        </span>
        <ChevronRight className="icon-sm text-muted-foreground shrink-0" aria-hidden />
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground p-spacing-1 shrink-0 rounded-lg transition-colors"
        aria-label={CAMPAIGN_BRAIN_NUDGE_MESSAGES.dismissLabel}
        onClick={handleDismiss}
      >
        <X className="icon-sm" aria-hidden />
      </button>
    </div>
  )
}
