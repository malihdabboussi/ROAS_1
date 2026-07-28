'use client'

import { useMemo, useState } from 'react'
import { BrainCircuit } from 'lucide-react'
import { toast } from 'sonner'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useActiveMessages, useChatStore } from '@/features/studio/store/use-chat-store'
import { processConversationToBrain } from '@/lib/brain/process-conversation-api'
import { assignConversationScope } from '@/lib/conversations/conversations-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS,
  countUserMessageTurns,
  shouldOfferCampaignBrainNudge,
} from '../config/work-context.config'
import {
  addCampaignBrainNudgeDismissedConversationId,
  readCampaignBrainNudgeDismissedConversationIds,
} from '../lib/global-chat-storage'
import { useGlobalChatStore } from '../store/use-global-chat-store'
import { ChatCampaignPicker } from './ChatCampaignPicker'

const NUDGE_ERRORS = {
  SELECT_CAMPAIGN: 'Pick a client campaign first.',
  SAVE_FAILED: 'Could not attach and save — try again.',
} as const

const NUDGE_SUCCESS = {
  SAVED: 'Attached to campaign and saved to campaign brain.',
} as const

export function ChatCampaignBrainNudge() {
  const workContext = useGlobalChatStore((s) => s.workContext)
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const messages = useActiveMessages()
  const spaces = useSpacesStore((s) => s.spaces)
  const [dismissedIds, setDismissedIds] = useState(() =>
    readCampaignBrainNudgeDismissedConversationIds(),
  )
  const [selectedSpaceId, setSelectedSpaceId] = useState('')
  const [saving, setSaving] = useState(false)

  const userTurnCount = useMemo(() => countUserMessageTurns(messages), [messages])
  const dismissed =
    Boolean(activeConversationId) && dismissedIds.includes(activeConversationId ?? '')

  const eligible = shouldOfferCampaignBrainNudge({
    surface: workContext.surface,
    spaceId: workContext.spaceId,
    userTurnCount,
    minUserTurns: CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS,
    dismissed,
  })

  const clientSpaces = useMemo(
    () =>
      spaces.filter(
        (space) =>
          typeof space.campaign_id === 'string' &&
          space.campaign_id.length > 0 &&
          space.space_kind !== 'personal_dashboard',
      ),
    [spaces],
  )

  if (!eligible || !activeConversationId || activeConversationId.startsWith('pending-')) {
    return null
  }

  const handleDismiss = () => {
    setDismissedIds(addCampaignBrainNudgeDismissedConversationId(activeConversationId))
  }

  const handleAccept = async () => {
    const space = clientSpaces.find((row) => row.id === selectedSpaceId)
    if (!space?.campaign_id) {
      toast.error(NUDGE_ERRORS.SELECT_CAMPAIGN)
      return
    }

    setSaving(true)
    try {
      await assignConversationScope(activeConversationId, space.campaign_id, space.id)
      setWorkContext({
        surface: 'spaces',
        spaceId: space.id,
        campaignId: space.campaign_id,
      })
      const payloadMessages = messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          role: message.role,
          content: message.content ?? '',
        }))
        .filter((message) => message.content.trim().length > 0)

      await processConversationToBrain({
        messages: payloadMessages,
        campaign_id: space.campaign_id,
        source_id: activeConversationId,
        source_title: `Conversation save · ${space.title}`,
        source_type: 'conversation',
        session_key: `studio:nudge:${activeConversationId}`,
      })

      setDismissedIds(addCampaignBrainNudgeDismissedConversationId(activeConversationId))
      toast.success(NUDGE_SUCCESS.SAVED)
    } catch (error) {
      toast.error(sanitizeUserError(error, NUDGE_ERRORS.SAVE_FAILED))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="chat-surface-rec-banner mx-spacing-2 mb-spacing-2 shrink-0">
      <div className="gap-spacing-3 flex items-start">
        <div className="bg-primary/10 text-primary mt-spacing-1 h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-full">
          <BrainCircuit className="icon-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="body-3 text-foreground font-semibold">Save this chat to a campaign</p>
          <p className="body-4 text-muted-foreground mt-spacing-1 leading-snug">
            Keep this conversation and its decisions with the right client campaign.
          </p>
          <div className="mt-spacing-2">
            <ChatCampaignPicker
              options={clientSpaces.map((space) => ({ id: space.id, label: space.title }))}
              value={selectedSpaceId}
              onChange={setSelectedSpaceId}
              disabled={saving || clientSpaces.length === 0}
            />
          </div>
          <div className="gap-spacing-2 mt-spacing-2 flex items-center justify-end">
            <button
              type="button"
              className="button-compact button-glass-neutral"
              disabled={saving}
              onClick={handleDismiss}
            >
              Not now
            </button>
            <button
              type="button"
              className="button-compact button-glass-purple disabled:opacity-50"
              disabled={saving || !selectedSpaceId}
              onClick={() => void handleAccept()}
            >
              {saving ? 'Saving…' : 'Attach and save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
